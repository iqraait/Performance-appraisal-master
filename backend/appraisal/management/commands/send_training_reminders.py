from django.core.management.base import BaseCommand
from appraisal.whatsapp_service import check_and_send_all_due_reminders


class Command(BaseCommand):
    help = "Checks all training staff and sends automated WhatsApp reminders to Department Admins 1 week before 1-month training period ends."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting automated check for due training assessment reminders..."))
        result = check_and_send_all_due_reminders()
        total = result['total_eligible']
        sent = result['sent_count']
        failed = result['failed_count']

        self.stdout.write(self.style.SUCCESS(f"Finished check. Eligible: {total} | Successfully Sent: {sent} | Failed: {failed}"))
        for item in result['results']:
            status_style = self.style.SUCCESS if item['status'] == 'Sent' else self.style.ERROR
            self.stdout.write(status_style(f" - [{item['code']}] {item['name']}: {item['status']} - {item['message']}"))
