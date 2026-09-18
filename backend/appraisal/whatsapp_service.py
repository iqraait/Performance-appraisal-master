import json
import re
import datetime
import urllib.request
import urllib.error
from django.utils import timezone
from django.conf import settings
from .models import TrainingEmployee, DepartmentAdmin, WhatsAppConfig, Employee


def clean_phone_number(raw_phone):
    """
    Cleans phone number into standard international format without '+' or special characters.
    Defaults to 91 (India) if a 10-digit number is provided.
    """
    if not raw_phone:
        return ""
    # Strip any spaces, dashes, parenthesis, or '+'
    cleaned = re.sub(r'[\s\-\(\)\+]', '', str(raw_phone).strip())
    # If 10 digits, prepend default India country code 91
    if len(cleaned) == 10 and cleaned.isdigit():
        cleaned = f"91{cleaned}"
    return cleaned


def get_whatsapp_config():
    """
    Retrieves the WhatsApp configuration from the database, or initializes default record.
    """
    config = WhatsAppConfig.objects.first()
    if not config:
        config = WhatsAppConfig.objects.create(
            api_token="",
            phone_number_id="",
            business_account_id="",
            template_name="training_assessment_reminder",
            template_language="en_US",
            base_url="http://172.16.21.161:5173",
            is_enabled=True
        )
    return config


def send_meta_whatsapp_message(to_number, template_name=None, parameters=None, fallback_text=None, force_text=False):
    """
    Sends an automated WhatsApp message via Meta WhatsApp Business Cloud API.
    Supports official approved templates (Utility category) and plain text fallback.
    """
    config = get_whatsapp_config()

    if not config.is_enabled:
        return False, "WhatsApp service is currently disabled in system configuration."

    token = config.api_token.strip()
    phone_id = config.phone_number_id.strip()

    if not token or not phone_id:
        return False, "Meta WhatsApp API Token or Phone Number ID is not configured. Please save credentials in WhatsApp Settings."

    clean_to = clean_phone_number(to_number)
    if not clean_to or len(clean_to) < 10:
        return False, f"Invalid destination phone number: '{to_number}'. Must include country code (e.g. 919876543210)."

    url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Construct Meta message payload
    if template_name and not force_text:
        param_list = parameters or []
        body_parameters = [{"type": "text", "text": str(p)} for p in param_list]
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": config.template_language or "en"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": body_parameters
                    }
                ]
            }
        }
    else:
        text_body = fallback_text or "Notification from Employee Appraisal System"
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": text_body
            }
        }

    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            return True, res_json
    except urllib.error.HTTPError as http_err:
        err_content = http_err.read().decode('utf-8')
        try:
            err_json = json.loads(err_content)
            meta_err = err_json.get('error', {})
            msg = meta_err.get('message') or meta_err.get('error_user_msg') or str(err_json)
            code = meta_err.get('code')
            subcode = meta_err.get('error_subcode')
            details = f"Meta Error (Code {code}, Subcode {subcode}): {msg}"
            return False, details
        except Exception:
            return False, f"HTTP Error {http_err.code}: {err_content}"
    except Exception as e:
        return False, f"Connection error calling Meta Graph API: {str(e)}"


def send_trainee_assessment_reminder(trainee, custom_base_url=None):
    """
    Sends WhatsApp alert for a specific trainee to their Department Admin(s).
    """
    if isinstance(trainee, int):
        try:
            trainee = TrainingEmployee.objects.get(id=trainee)
        except TrainingEmployee.DoesNotExist:
            return False, f"Training employee record with ID {trainee} does not exist."

    config = get_whatsapp_config()
    base_url = custom_base_url or config.base_url or "http://172.16.21.161:5173"

    # Find Department Admin(s) assigned to this trainee's department
    dept = trainee.department
    dept_admins = []
    all_das = DepartmentAdmin.objects.all()
    for da in all_das:
        if dept and dept in da.departments:
            dept_admins.append(da)

    if not dept_admins:
        err_msg = f"No Department Admin found assigned to department '{dept}'."
        trainee.whatsapp_notification_status = 'Failed'
        trainee.whatsapp_error_message = err_msg
        trainee.save(update_fields=['whatsapp_notification_status', 'whatsapp_error_message'])
        return False, err_msg

    # Filter admins that have a WhatsApp number configured
    admins_with_wa = [da for da in dept_admins if da.whatsapp_number and clean_phone_number(da.whatsapp_number)]
    if not admins_with_wa:
        names = ", ".join([da.user.username for da in dept_admins])
        err_msg = f"Department Admin(s) ({names}) for '{dept}' do not have a WhatsApp number registered."
        trainee.whatsapp_notification_status = 'Failed'
        trainee.whatsapp_error_message = err_msg
        trainee.save(update_fields=['whatsapp_notification_status', 'whatsapp_error_message'])
        return False, err_msg

    # Direct assessment URL (pointing to dedicated Trainee Assessment Form)
    form_link = f"{base_url.rstrip('/')}/trainee-assessment?code={trainee.employee_code}"
    doj_str = trainee.date_of_joining.strftime('%d-%m-%Y') if trainee.date_of_joining else '-'
    end_str = trainee.training_end_date.strftime('%d-%m-%Y') if trainee.training_end_date else '-'

    success_recipients = []
    failed_recipients = []

    for da in admins_with_wa:
        admin_name = da.user.get_full_name() or da.user.username
        wa_number = da.whatsapp_number

        # Parameters for approved template:
        # {{1}}: Admin name
        # {{2}}: Staff Name (Employee Code)
        # {{3}}: Department
        # {{4}}: Date of Joining
        # {{5}}: Training End Date
        # {{6}}: Assessment Form Link
        params = [
            admin_name,
            f"{trainee.name} ({trainee.employee_code})",
            trainee.department,
            doj_str,
            end_str,
            form_link
        ]

        fallback_text = (
            f"Dear {admin_name},\n\n"
            f"Staff member {trainee.name} ({trainee.employee_code}) from your department ({trainee.department}) "
            f"joined on {doj_str}. Their 1-month training period will complete on {end_str}.\n\n"
            f"Please review and complete their training assessment form using the link below:\n"
            f"{form_link}\n\n"
            f"Thank you,\nHospital Administration"
        )

        success, result = send_meta_whatsapp_message(
            to_number=wa_number,
            template_name=config.template_name or "training_assessment_reminder",
            parameters=params,
            fallback_text=fallback_text
        )

        if success:
            success_recipients.append(f"{admin_name} ({wa_number})")
        else:
            # Attempt plain text fallback if template fails (e.g. template pending approval or sandbox)
            txt_success, txt_result = send_meta_whatsapp_message(
                to_number=wa_number,
                force_text=True,
                fallback_text=fallback_text
            )
            if txt_success:
                success_recipients.append(f"{admin_name} ({wa_number}) [Text Fallback]")
            else:
                failed_recipients.append(f"{admin_name} ({wa_number}): {result}")

    if success_recipients:
        trainee.whatsapp_notification_sent = True
        trainee.whatsapp_notification_date = timezone.now()
        trainee.whatsapp_notification_status = 'Sent'
        trainee.whatsapp_error_message = "" if not failed_recipients else "; ".join(failed_recipients)
        trainee.status = 'Assessment Due' if trainee.status == 'Training' else trainee.status
        trainee.save(update_fields=[
            'whatsapp_notification_sent', 
            'whatsapp_notification_date', 
            'whatsapp_notification_status', 
            'whatsapp_error_message',
            'status'
        ])
        return True, f"WhatsApp reminder delivered successfully to: {', '.join(success_recipients)}"
    else:
        err_summary = "; ".join(failed_recipients)
        trainee.whatsapp_notification_status = 'Failed'
        trainee.whatsapp_error_message = err_summary
        trainee.save(update_fields=['whatsapp_notification_status', 'whatsapp_error_message'])
        return False, f"Failed to deliver reminder: {err_summary}"


def check_and_send_all_due_reminders():
    """
    Checks all active trainees whose training end date is within 7 days from today
    and whose WhatsApp notification has not been sent yet.
    Sends notifications automatically and returns summary.
    """
    today = timezone.now().date()
    # Filter trainees in 'Training' or 'Assessment Due' status who haven't received reminder
    trainees = TrainingEmployee.objects.filter(
        whatsapp_notification_sent=False,
        status__in=['Training', 'Assessment Due']
    )

    eligible_trainees = []
    for t in trainees:
        if t.training_end_date:
            alert_target_date = t.training_end_date - datetime.timedelta(days=7)
            # If today is on or after the 7-day alert date, notification is due
            if today >= alert_target_date:
                eligible_trainees.append(t)

    total_eligible = len(eligible_trainees)
    sent_count = 0
    failed_count = 0
    results_detail = []

    for trainee in eligible_trainees:
        success, message = send_trainee_assessment_reminder(trainee)
        if success:
            sent_count += 1
            results_detail.append({
                "code": trainee.employee_code,
                "name": trainee.name,
                "status": "Sent",
                "message": message
            })
        else:
            failed_count += 1
            results_detail.append({
                "code": trainee.employee_code,
                "name": trainee.name,
                "status": "Failed",
                "message": message
            })

    return {
        "total_eligible": total_eligible,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "results": results_detail
    }
