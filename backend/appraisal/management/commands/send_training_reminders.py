from django.core.management.base import BaseCommand
from appraisal.email_service import check_and_send_all_due_email_reminders


class Command(BaseCommand):
    help = "Checks training staff and sends automated email reminders (7 days before end date to Candidate & Dept Head; 3 days before to Dept Head only)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting automated check for due training assessment email notifications..."))
        result = check_and_send_all_due_email_reminders()
        total = result['total_eligible']
        sent = result['sent_count']
        failed = result['failed_count']

        self.stdout.write(self.style.SUCCESS(f"Finished check. Eligible: {total} | Successfully Sent: {sent} | Failed: {failed}"))
        for item in result['results']:
            status_style = self.style.SUCCESS if item['status'] == 'Sent' else self.style.ERROR
            self.stdout.write(status_style(f" - [{item['code']}] {item['name']} ({item.get('type', '')}): {item['status']} - {item['message']}"))
