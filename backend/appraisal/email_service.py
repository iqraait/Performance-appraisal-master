import logging
import datetime
from django.utils import timezone
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from .models import TrainingEmployee, DepartmentAdmin, EmailConfig

logger = logging.getLogger(__name__)

DEFAULT_FROM_EMAIL = getattr(settings, 'DEFAULT_FROM_EMAIL', 'HR@IQRAAHOSPITAL.IN')


def get_department_admins_for_dept(department_name):
    """
    Finds all DepartmentAdmin instances responsible for the given department name (case-insensitive).
    Handles both JSON list and string formats gracefully.
    """
    if not department_name:
        return []
    target = department_name.strip().lower()
    matched = []
    for da in DepartmentAdmin.objects.all():
        if not da.departments:
            continue
        if isinstance(da.departments, list):
            dept_list = da.departments
        else:
            dept_list = [d.strip() for d in str(da.departments).split(',') if d.strip()]
        if any(str(d).strip().lower() == target for d in dept_list):
            matched.append(da)
    return matched


def get_department_emails(department_name):
    """
    Returns unique non-empty email addresses registered for the department's admins.
    Checks da.email first, then fallback to da.user.email.
    """
    admins = get_department_admins_for_dept(department_name)
    emails = []
    for da in admins:
        eff = da.effective_email
        if eff and eff not in emails:
            emails.append(eff)
    return emails


def get_frontend_base_url(custom_base_url=None):
    if custom_base_url:
        return custom_base_url.rstrip('/')
    return getattr(settings, 'FRONTEND_BASE_URL', 'http://172.16.21.161:5173').rstrip('/')


def build_department_summary_email(department_name, trainees_list, is_reminder=False, base_url=None):
    """
    Builds the consolidated email subject and bodies (text & html) for the Department Head,
    containing a table of all pending staff/trainees in that department.
    """
    url_base = get_frontend_base_url(base_url)
    today_str = timezone.now().strftime('%d/%m/%Y')
    prefix = "Reminder: " if is_reminder else ""
    dept_label = department_name or 'Department'

    if len(trainees_list) == 1:
        subject = f"{prefix}Training Completion Intimation – {trainees_list[0].name} ({dept_label})"
    else:
        subject = f"{prefix}Training Completion Intimation – {dept_label} ({len(trainees_list)} Staff Pending Assessment)"

    table_rows_html = []
    table_rows_text = []

    for idx, trainee in enumerate(trainees_list, 1):
        doj_str = trainee.date_of_joining.strftime('%d/%m/%Y') if trainee.date_of_joining else '-'
        end_str = trainee.training_end_date.strftime('%d/%m/%Y') if trainee.training_end_date else '-'
        form_link = f"{url_base}/trainee-assessment?code={trainee.employee_code}"
        period_str = f"{trainee.training_period_months} Month(s)" if trainee.training_period_months else "1 Month"
        desig_str = trainee.designation or '-'

        table_rows_html.append(f"""
          <tr>
            <td style="text-align: center; color: #64748b; font-weight: 600;">{idx}</td>
            <td><strong style="color: #0f766e; font-family: monospace; font-size: 13px;">{trainee.employee_code}</strong></td>
            <td><strong>{trainee.name}</strong></td>
            <td>{desig_str}</td>
            <td>{doj_str}</td>
            <td><strong>{end_str}</strong></td>
            <td><strong style="color: #b45309;">{end_str}</strong></td>
            <td style="text-align: center;">
              <a href="{form_link}" style="background-color: #0f766e; color: #ffffff !important; padding: 6px 14px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 12px; display: inline-block;">Open Form</a>
            </td>
          </tr>
        """)

        table_rows_text.append(
            f"{idx}.\t{trainee.employee_code}\t{trainee.name}\t{desig_str}\t{doj_str}\t{end_str}\t{end_str}\t{form_link}"
        )

    joined_rows_html = "\n".join(table_rows_html)
    joined_rows_text = "\n".join(table_rows_text)

    trainee_count_text = f"{len(trainees_list)} staff member{'s' if len(trainees_list) > 1 else ''}"

    plain_text = f"""{today_str}

{subject}

Dear Sir/Madam,
This is to inform you that the training period of the following {trainee_count_text} in your department ({dept_label}) is about to expire.
We request you to review their performance and complete the trainee assessment form through the Training Master section at the following links before the specified deadline:

SI. No.\tCode\tTrainee Name\tDesignation\tDOJ\tTraining End Date\tAssessment Deadline\tAssessment Link
{joined_rows_text}

Your timely completion of the assessment will help us proceed with the necessary further action. If you have any questions or concerns, please contact us at extension 252.
Your kind cooperation is solicited.

HR Dept.
IQRAA International Hospital & Research Centre
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8fafc; }}
    .container {{ max-width: 860px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px 28px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }}
    .header-box {{ border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }}
    .hosp-title {{ font-size: 17px; font-weight: 800; color: #0f766e; text-transform: uppercase; margin: 0; }}
    .hosp-sub {{ font-size: 12px; color: #64748b; margin-top: 2px; }}
    .meta-box {{ background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 10px 16px; margin: 16px 0; font-size: 13px; }}
    .title {{ font-size: 17px; font-weight: 700; color: #0f766e; margin-top: 14px; margin-bottom: 12px; }}
    .intro {{ font-size: 14px; margin-bottom: 12px; color: #334155; }}
    table.data-tbl {{ width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }}
    table.data-tbl th {{ background-color: #0f766e; color: #ffffff; padding: 10px 12px; text-align: left; border: 1px solid #0d9488; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
    table.data-tbl td {{ padding: 10px 12px; border: 1px solid #cbd5e1; vertical-align: middle; }}
    table.data-tbl tr:nth-child(even) {{ background-color: #f8fafc; }}
    .summary-badge {{ background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; display: inline-block; }}
    .footer {{ margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header-box">
      <div class="hosp-title">IQRAA International Hospital & Research Centre</div>
      <div class="hosp-sub">Human Resources Department • Training & Appraisal Management</div>
    </div>

    <div class="meta-box">
      <table style="width: 100%; font-size: 13px; border: none;">
        <tr style="border: none;">
          <td style="border: none; padding: 2px 0;"><strong>Date:</strong> {today_str}</td>
          <td style="border: none; padding: 2px 0;"><strong>Department:</strong> <span style="color: #0f766e; font-weight: 700;">{dept_label}</span></td>
          <td style="border: none; padding: 2px 0; text-align: right;"><strong>Pending Staff:</strong> <span class="summary-badge">{len(trainees_list)} Staff Member(s)</span></td>
        </tr>
      </table>
    </div>

    <div class="title">{prefix}Training Completion Intimation – {dept_label}</div>

    <p class="intro">Dear Sir/Madam,</p>
    <p class="intro">
      This is to inform you that the training period for the following <strong>{trainee_count_text}</strong> in your department is completing soon.
      We request you to review their performance and submit the Trainee Assessment Form using the direct links below before the specified deadline:
    </p>

    <table class="data-tbl">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Staff Code</th>
          <th>Staff Name</th>
          <th>Designation</th>
          <th>DOJ</th>
          <th>Training End Date</th>
          <th>Submission Deadline</th>
          <th style="text-align: center;">Action</th>
        </tr>
      </thead>
      <tbody>
        {joined_rows_html}
      </tbody>
    </table>

    <p class="intro">
      Your timely completion of the assessment will ensure seamless transition and completion of training evaluation. If you have any questions or require assistance, please contact the HR Department at Extension 252.
    </p>
    <p class="intro">Your kind cooperation is solicited.</p>

    <div class="footer">
      <strong>HR Department</strong><br>
      IQRAA International Hospital & Research Centre<br>
      <span style="font-size: 11px; color: #94a3b8;">This is an automated intimation from the Employee Performance Appraisal & Training Management System.</span>
    </div>
  </div>
</body>
</html>
"""
    return subject, plain_text, html_content


def build_department_head_email(trainee, is_reminder=False, base_url=None):
    """
    Builds the email subject and bodies for a single trainee's Department Head.
    Wraps build_department_summary_email for backwards compatibility.
    """
    dept = trainee.department or 'Department'
    return build_department_summary_email(dept, [trainee], is_reminder=is_reminder, base_url=base_url)


def build_candidate_email(trainee):
    """
    Builds the exact email subject and bodies (text & html) for the Candidate.
    """
    end_str = trainee.training_end_date.strftime('%d/%m/%Y') if trainee.training_end_date else '-'
    subject = "Completion of Training Period"

    plain_text = f"""Subject: Completion of Training Period
Dear {trainee.name},
This is to inform you that your training period at IQRAA is nearing completion.
Your training period will be completed on {end_str}. As part of the training completion process, your performance during the training period will be reviewed and assessed by the concerned Department Head.
You are requested to contact the concerned Department Head for further proceedings regarding the completion of your training.
For any queries or concerns, please contact the HR Department at Extension 252.
Thank you for your cooperation.


HR Dept.
IQRAA International Hospital & Research Centre
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; }}
    .title {{ font-size: 18px; font-weight: 700; color: #0f766e; margin-top: 0; margin-bottom: 16px; }}
    .intro {{ font-size: 14px; margin-bottom: 14px; }}
    .info-box {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-size: 14px; }}
    .footer {{ margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569; }}
  </style>
</head>
<body>
  <div class="title">Completion of Training Period</div>

  <p class="intro">Dear {trainee.name},</p>
  <p class="intro">This is to inform you that your training period at IQRAA is nearing completion.</p>

  <div class="info-box">
    Your training period will be completed on <strong>{end_str}</strong>. As part of the training completion process, your performance during the training period will be reviewed and assessed by the concerned Department Head.
  </div>

  <p class="intro">You are requested to contact the concerned Department Head for further proceedings regarding the completion of your training.</p>
  <p class="intro">For any queries or concerns, please contact the HR Department at Extension 252.</p>
  <p class="intro">Thank you for your cooperation.</p>

  <div class="footer">
    <strong>HR Dept.</strong><br>
    IQRAA International Hospital & Research Centre
  </div>
</body>
</html>
"""
    return subject, plain_text, html_content


def get_email_config():
    """
    Retrieves the EmailConfig from the database, or initializes default record.
    """
    config = EmailConfig.objects.first()
    if not config:
        config = EmailConfig.objects.create(
            smtp_host='smtp.office365.com',
            smtp_port=587,
            use_tls=True,
            use_ssl=False,
            from_email='HR@IQRAAHOSPITAL.IN',
            smtp_user='HR@IQRAAHOSPITAL.IN',
            smtp_password='',
            is_enabled=True
        )
    return config


def get_email_connection():
    """
    Builds a Django email connection using dynamic EmailConfig or settings.
    """
    # If locmem backend is active (e.g. during tests), let Django handle connection
    if getattr(settings, 'EMAIL_BACKEND', '').endswith('locmem.EmailBackend'):
        return None
    try:
        config = get_email_config()
        if config and config.is_enabled:
            from django.core.mail.backends.smtp import EmailBackend
            return EmailBackend(
                host=config.smtp_host.strip() if config.smtp_host else 'smtp.office365.com',
                port=int(config.smtp_port or 587),
                username=config.smtp_user.strip() if config.smtp_user else '',
                password=config.smtp_password.strip() if config.smtp_password else '',
                use_tls=config.use_tls,
                use_ssl=config.use_ssl,
                timeout=getattr(settings, 'EMAIL_TIMEOUT', 10)
            )
    except Exception as e:
        logger.warning(f"Could not initialize dynamic SMTP connection: {e}")
    return None


def send_raw_email(subject, plain_text, html_content, recipients, from_email=None):
    """
    Sends an EmailMultiAlternatives message.
    """
    config = None
    try:
        config = get_email_config()
    except Exception:
        pass

    sender = from_email or (config.from_email if config and config.from_email else DEFAULT_FROM_EMAIL)
    if not recipients:
        return False, "No recipient email addresses provided."

    recipient_list = recipients if isinstance(recipients, list) else [recipients]
    recipient_list = [r.strip() for r in recipient_list if r and r.strip()]

    if not recipient_list:
        return False, "Recipient email list is empty."

    try:
        connection = get_email_connection()
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_text,
            from_email=sender,
            to=recipient_list,
            connection=connection
        )
        if html_content:
            msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        return True, f"Successfully sent to {', '.join(recipient_list)}"
    except Exception as e:
        err_str = str(e)
        logger.error(f"Failed to send email to {recipient_list}: {err_str}")
        if '530' in err_str or 'Authentication Required' in err_str or 'Username and Password not accepted' in err_str or '535' in err_str:
            clean_err = f"SMTP Authentication Required: Please configure the email password in 'Email Settings' (Host: {config.smtp_host if config else 'smtp.office365.com'}, Port: {config.smtp_port if config else 587})."
        elif 'timed out' in err_str.lower():
            clean_err = f"SMTP Connection timed out. Please verify SMTP host and port in 'Email Settings'."
        else:
            clean_err = err_str
        return False, clean_err


def send_department_wise_trainee_emails(trainees, is_reminder=False, custom_base_url=None, notify_candidates=False):
    """
    Groups trainees by department and sends ONE email per department to the Department Head(s).
    The email contains a consolidated table of all pending trainees in that department.
    Optionally dispatches individual notification emails to candidates if notify_candidates is True.
    """
    if not trainees:
        return {
            "success": False,
            "message": "No trainees provided for email notification.",
            "total_staff": 0,
            "sent_staff": 0,
            "failed_staff": 0,
            "total_departments": 0,
            "sent_departments": 0,
            "failed_departments": 0,
            "department_results": [],
            "total": 0,
            "sent": 0,
            "failed": 0,
            "details": []
        }

    # Normalize to list of TrainingEmployee objects
    trainee_objs = []
    for item in trainees:
        if isinstance(item, int):
            try:
                t = TrainingEmployee.objects.get(id=item)
                trainee_objs.append(t)
            except TrainingEmployee.DoesNotExist:
                logger.warning(f"TrainingEmployee id {item} not found")
        else:
            trainee_objs.append(item)

    # Group by department (strip and normalize)
    from collections import defaultdict
    dept_map = defaultdict(list)
    for t in trainee_objs:
        d_name = (t.department or 'Unassigned').strip()
        dept_map[d_name].append(t)

    now = timezone.now()
    dept_results = []
    item_details = []

    for dept_name, dept_trainees in dept_map.items():
        dept_emails = get_department_emails(dept_name)

        # Fallback to department_email on trainee records if no admin registered
        if not dept_emails:
            for t in dept_trainees:
                if t.department_email and t.department_email.strip():
                    eff = t.department_email.strip()
                    if eff not in dept_emails:
                        dept_emails.append(eff)

        trainees_meta = [{
            "id": t.id,
            "employee_code": t.employee_code,
            "name": t.name,
            "designation": t.designation or '-',
            "training_end_date": str(t.training_end_date) if t.training_end_date else '-'
        } for t in dept_trainees]

        if not dept_emails:
            err_msg = f"No Department Admin email found for department '{dept_name}'. Please add the Department Email in Admin Login."
            for t in dept_trainees:
                t.email_notification_status = 'Failed'
                t.email_error_message = err_msg
                t.save(update_fields=['email_notification_status', 'email_error_message'])
                item_details.append({
                    "id": t.id,
                    "employee_code": t.employee_code,
                    "name": t.name,
                    "success": False,
                    "message": err_msg
                })

            dept_results.append({
                "department": dept_name,
                "recipient_emails": [],
                "trainees_count": len(dept_trainees),
                "trainees": trainees_meta,
                "status": "Failed",
                "message": err_msg
            })
            continue

        # Build consolidated department email
        subject, plain_text, html_content = build_department_summary_email(
            dept_name, dept_trainees, is_reminder=is_reminder, base_url=custom_base_url
        )

        success_dept, msg_dept = send_raw_email(subject, plain_text, html_content, dept_emails)

        if success_dept:
            for t in dept_trainees:
                t.dept_email_sent = True
                t.dept_email_date = now
                t.email_notification_sent = True
                t.email_notification_date = now
                t.email_notification_status = 'Sent'
                t.email_error_message = ""
                if is_reminder:
                    t.dept_reminder_3day_sent = True
                    t.dept_reminder_3day_date = now
                if t.status == 'Training':
                    t.status = 'Assessment Due'
                t.save()

                item_details.append({
                    "id": t.id,
                    "employee_code": t.employee_code,
                    "name": t.name,
                    "success": True,
                    "message": f"Included in consolidated email to Dept Head ({', '.join(dept_emails)})"
                })

            # Optional candidate notification
            if notify_candidates and not is_reminder:
                for t in dept_trainees:
                    c_email = (t.email or '').strip()
                    if c_email:
                        c_subj, c_plain, c_html = build_candidate_email(t)
                        send_raw_email(c_subj, c_plain, c_html, [c_email])
                        t.candidate_email_sent = True
                        t.candidate_email_date = now
                        t.save(update_fields=['candidate_email_sent', 'candidate_email_date'])

            dept_results.append({
                "department": dept_name,
                "recipient_emails": dept_emails,
                "trainees_count": len(dept_trainees),
                "trainees": trainees_meta,
                "status": "Sent",
                "message": f"Successfully sent consolidated email to {', '.join(dept_emails)} for {len(dept_trainees)} staff."
            })
        else:
            for t in dept_trainees:
                t.email_notification_status = 'Failed'
                t.email_error_message = f"Dept Head email failed: {msg_dept}"
                t.save(update_fields=['email_notification_status', 'email_error_message'])
                item_details.append({
                    "id": t.id,
                    "employee_code": t.employee_code,
                    "name": t.name,
                    "success": False,
                    "message": f"Dept Head email failed: {msg_dept}"
                })

            dept_results.append({
                "department": dept_name,
                "recipient_emails": dept_emails,
                "trainees_count": len(dept_trainees),
                "trainees": trainees_meta,
                "status": "Failed",
                "message": f"Delivery failed: {msg_dept}"
            })

    total_staff = len(trainee_objs)
    sent_staff = sum(r["trainees_count"] for r in dept_results if r["status"] == "Sent")
    failed_staff = sum(r["trainees_count"] for r in dept_results if r["status"] == "Failed")
    total_depts = len(dept_results)
    sent_depts = sum(1 for r in dept_results if r["status"] == "Sent")
    failed_depts = sum(1 for r in dept_results if r["status"] == "Failed")

    if failed_staff == 0 and sent_staff > 0:
        summary_msg = f"Sent {sent_depts} department email{'s' if sent_depts > 1 else ''} covering {sent_staff} staff member{'s' if sent_staff > 1 else ''} successfully!"
    elif sent_staff > 0 and failed_staff > 0:
        summary_msg = f"Partially sent: {sent_depts} department email(s) succeeded ({sent_staff} staff), but {failed_depts} department(s) failed ({failed_staff} staff)."
    elif total_staff == 0:
        summary_msg = "No trainees found to process."
    else:
        summary_msg = f"Failed to send department emails for {total_staff} staff member(s). Check SMTP settings or Department Admin email tags."

    return {
        "success": sent_staff > 0 or total_staff == 0,
        "message": summary_msg,
        "total_staff": total_staff,
        "sent_staff": sent_staff,
        "failed_staff": failed_staff,
        "total_departments": total_depts,
        "sent_departments": sent_depts,
        "failed_departments": failed_depts,
        "department_results": dept_results,
        # Backward compatibility for tests and old endpoints
        "total": total_staff,
        "sent": sent_staff,
        "failed": failed_staff,
        "details": item_details
    }


def send_trainee_assessment_email(trainee, is_reminder_3day=False, custom_base_url=None, notify_candidates=True):
    """
    Dispatches email notification for an individual trainee to Department Head (and candidate).
    Wraps send_department_wise_trainee_emails under the hood for consistent formatting and tracking.
    """
    if isinstance(trainee, int):
        try:
            trainee = TrainingEmployee.objects.get(id=trainee)
        except TrainingEmployee.DoesNotExist:
            return False, f"Trainee ID {trainee} not found."

    res = send_department_wise_trainee_emails(
        [trainee],
        is_reminder=is_reminder_3day,
        custom_base_url=custom_base_url,
        notify_candidates=notify_candidates
    )
    if res["sent_staff"] > 0:
        dept_msg = res["department_results"][0]["message"] if res["department_results"] else "Email notification dispatched successfully!"
        return True, dept_msg
    else:
        dept_msg = res["department_results"][0]["message"] if res["department_results"] else "Failed to send email notification."
        return False, dept_msg


def check_and_send_all_due_email_reminders(custom_base_url=None):
    """
    Automated check that scans all trainees:
    - Trainees 7 days before training period ends: initial intimation.
    - Trainees 3 days before training period ends: reminder intimation.
    Sends department-wise aggregated emails so each Department Head receives ONLY ONE email
    with a table of all due staff in their department!
    """
    today = timezone.now().date()
    trainees = TrainingEmployee.objects.filter(status__in=['Training', 'Assessment Due'])

    due_7day = []
    due_3day = []

    for t in trainees:
        if not t.training_end_date:
            continue
        days_left = (t.training_end_date - today).days

        if days_left <= 7 and not t.email_notification_sent:
            due_7day.append(t)
        elif days_left <= 3 and not t.dept_reminder_3day_sent:
            due_3day.append(t)

    combined_dept_results = []
    total_eligible = len(due_7day) + len(due_3day)
    total_sent = 0
    total_failed = 0
    results_detail = []

    if due_7day:
        res_7 = send_department_wise_trainee_emails(due_7day, is_reminder=False, custom_base_url=custom_base_url)
        total_sent += res_7["sent_staff"]
        total_failed += res_7["failed_staff"]
        combined_dept_results.extend(res_7["department_results"])
        for item in res_7["details"]:
            results_detail.append({
                "code": item["employee_code"],
                "name": item["name"],
                "type": "7-Day Notice (Dept-Wise)",
                "status": "Sent" if item["success"] else "Failed",
                "message": item["message"]
            })

    if due_3day:
        res_3 = send_department_wise_trainee_emails(due_3day, is_reminder=True, custom_base_url=custom_base_url)
        total_sent += res_3["sent_staff"]
        total_failed += res_3["failed_staff"]
        combined_dept_results.extend(res_3["department_results"])
        for item in res_3["details"]:
            results_detail.append({
                "code": item["employee_code"],
                "name": item["name"],
                "type": "3-Day Reminder (Dept-Wise)",
                "status": "Sent" if item["success"] else "Failed",
                "message": item["message"]
            })

    return {
        "total_eligible": total_eligible,
        "sent_count": total_sent,
        "failed_count": total_failed,
        "total_departments": len(combined_dept_results),
        "department_results": combined_dept_results,
        "results": results_detail
    }

