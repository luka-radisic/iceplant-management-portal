import random
from django.core.management.base import BaseCommand
from django.utils import timezone
# from companyconfig.models import EmployeeProfile  # Deprecated: EmployeeProfile model no longer exists

FILIPINO_NAMES = [
    "Jose Dela Cruz", "Maria Santos", "Juan Reyes", "Ana Bautista", "Carlo Mendoza",
    "Liza Navarro", "Edgar Flores", "Ramon Cruz", "Nina Garcia", "Mark Villanueva",
    "Paolo Torres", "Grace Lim", "Leo Fernandez", "Diana Ramos", "Victor Castillo"
]

DEPARTMENTS = ["Sales", "Inventory", "Finance", "Maintenance", "HR", "Fabrication", "Logistics"]

STATUSES = ["Active", "Inactive"]

class Command(BaseCommand):
    help = 'Generate realistic Filipino employee profiles (Deprecated - EmployeeProfile model removed)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('generate_employees command is deprecated because EmployeeProfile model no longer exists. Skipping employee data generation.'))