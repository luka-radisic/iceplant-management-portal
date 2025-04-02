"""
Script to create sample maintenance data for the Ice Plant Management Portal.
Industry-standard equipment and maintenance records.
"""
import os
import sys
import django
import random
from datetime import datetime, timedelta

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_core.settings')
django.setup()

from maintenance.models import MaintenanceItem, MaintenanceRecord
from django.utils import timezone
from django.contrib.auth.models import User

# Get or create a user for maintenance records
try:
    maintenance_user = User.objects.get(username="maintenance_tech")
except User.DoesNotExist:
    maintenance_user = User.objects.create_user(
        username="maintenance_tech",
        email="tech@iceplant.example",
        password="tech12345",
        first_name="Maintenance",
        last_name="Technician"
    )

# Equipment definitions - common in ice manufacturing plants
EQUIPMENT_DATA = [
    {
        "equipment_name": "Ammonia Compressor #1",
        "equipment_type": "Compressor",
        "model_number": "AC-2000",
        "serial_number": "ACP20221001",
        "location": "Engine Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=730),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=30),
        "notes": "Primary compressor for refrigeration system. Requires quarterly maintenance.",
    },
    {
        "equipment_name": "Ammonia Compressor #2",
        "equipment_type": "Compressor",
        "model_number": "AC-2000",
        "serial_number": "ACP20221002",
        "location": "Engine Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=730),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=45),
        "notes": "Backup compressor for refrigeration system. Requires quarterly maintenance.",
    },
    {
        "equipment_name": "Brine Chiller",
        "equipment_type": "Chiller",
        "model_number": "BC-5500",
        "serial_number": "BCH20201103",
        "location": "Brine Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=800),
        "maintenance_frequency": 6,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=60),
        "notes": "Main chiller for brine solution. Semi-annual maintenance required.",
    },
    {
        "equipment_name": "Condenser Unit #1",
        "equipment_type": "Condenser",
        "model_number": "CU-1200",
        "serial_number": "CU20191204",
        "location": "Roof",
        "status": "requires_maintenance",
        "installation_date": timezone.now().date() - timedelta(days=1200),
        "maintenance_frequency": 2,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() - timedelta(days=15),
        "notes": "Primary condenser unit. Showing signs of corrosion and requires cleaning.",
    },
    {
        "equipment_name": "Condenser Unit #2",
        "equipment_type": "Condenser",
        "model_number": "CU-1200",
        "serial_number": "CU20191205",
        "location": "Roof",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=1200),
        "maintenance_frequency": 2,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=10),
        "notes": "Secondary condenser unit.",
    },
    {
        "equipment_name": "Ice Can Filling System",
        "equipment_type": "Ice Production",
        "model_number": "IF-3000",
        "serial_number": "ICF20201206",
        "location": "Production Floor",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=800),
        "maintenance_frequency": 1,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=15),
        "notes": "Automated can filling system. Monthly maintenance required.",
    },
    {
        "equipment_name": "Brine Circulation Pump #1",
        "equipment_type": "Pump",
        "model_number": "BP-700",
        "serial_number": "BCP20191207",
        "location": "Brine Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=1100),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=75),
        "notes": "Primary pump for brine circulation.",
    },
    {
        "equipment_name": "Brine Circulation Pump #2",
        "equipment_type": "Pump",
        "model_number": "BP-700",
        "serial_number": "BCP20191208",
        "location": "Brine Room",
        "status": "under_maintenance",
        "installation_date": timezone.now().date() - timedelta(days=1100),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=5),
        "notes": "Backup pump for brine circulation. Currently undergoing scheduled maintenance.",
    },
    {
        "equipment_name": "Cooling Tower",
        "equipment_type": "Cooling System",
        "model_number": "CT-9000",
        "serial_number": "CT20181209",
        "location": "Exterior",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=1500),
        "maintenance_frequency": 6,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=90),
        "notes": "Main cooling tower for heat rejection. Semi-annual inspection required.",
    },
    {
        "equipment_name": "Ice Harvester",
        "equipment_type": "Ice Production",
        "model_number": "IH-2500",
        "serial_number": "IH20201210",
        "location": "Production Floor",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=850),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=40),
        "notes": "Automated ice harvesting system.",
    },
    {
        "equipment_name": "Refrigerant Receiver",
        "equipment_type": "Refrigeration",
        "model_number": "RR-4500",
        "serial_number": "RR20201211",
        "location": "Engine Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=800),
        "maintenance_frequency": 12,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=120),
        "notes": "Ammonia refrigerant storage vessel. Annual inspection required.",
    },
    {
        "equipment_name": "Air Compressor",
        "equipment_type": "Compressor",
        "model_number": "AC-1000",
        "serial_number": "AC20201212",
        "location": "Utility Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=750),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=35),
        "notes": "Provides compressed air for pneumatic systems.",
    },
    {
        "equipment_name": "Water Treatment System",
        "equipment_type": "Water System",
        "model_number": "WT-3000",
        "serial_number": "WT20201213",
        "location": "Utility Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=700),
        "maintenance_frequency": 2,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=25),
        "notes": "Water filtration and treatment system for ice production.",
    },
    {
        "equipment_name": "Emergency Generator",
        "equipment_type": "Power System",
        "model_number": "EG-5000",
        "serial_number": "EG20191214",
        "location": "Exterior",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=1000),
        "maintenance_frequency": 6,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=100),
        "notes": "Diesel generator for backup power during outages.",
    },
    {
        "equipment_name": "Ice Crusher",
        "equipment_type": "Ice Processing",
        "model_number": "IC-1500",
        "serial_number": "IC20201215",
        "location": "Processing Area",
        "status": "not_operational",
        "installation_date": timezone.now().date() - timedelta(days=600),
        "maintenance_frequency": 2,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() - timedelta(days=30),
        "notes": "Machine for producing crushed ice. Currently not operational due to motor failure.",
    },
    {
        "equipment_name": "Ammonia Leak Detection System",
        "equipment_type": "Safety System",
        "model_number": "ALD-2000",
        "serial_number": "ALD20191216",
        "location": "Facility-wide",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=1100),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=50),
        "notes": "Critical safety system for detecting ammonia leaks.",
    },
    {
        "equipment_name": "Control System PLC",
        "equipment_type": "Control System",
        "model_number": "PLC-3000",
        "serial_number": "PLC20201217",
        "location": "Control Room",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=730),
        "maintenance_frequency": 6,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=110),
        "notes": "Programmable Logic Controller for automation of ice production systems.",
    },
    {
        "equipment_name": "Evaporative Condenser",
        "equipment_type": "Condenser",
        "model_number": "EC-7000",
        "serial_number": "EC20191218",
        "location": "Roof",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=1150),
        "maintenance_frequency": 3,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=65),
        "notes": "Evaporative condenser for heat rejection.",
    },
    {
        "equipment_name": "Block Ice Mold System",
        "equipment_type": "Ice Production",
        "model_number": "BIM-4000",
        "serial_number": "BIM20201219",
        "location": "Production Floor",
        "status": "operational",
        "installation_date": timezone.now().date() - timedelta(days=650),
        "maintenance_frequency": 2,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() + timedelta(days=20),
        "notes": "System for producing large block ice.",
    },
    {
        "equipment_name": "Tube Ice Machine",
        "equipment_type": "Ice Production",
        "model_number": "TIM-3500",
        "serial_number": "TIM20201220",
        "location": "Production Floor",
        "status": "requires_maintenance",
        "installation_date": timezone.now().date() - timedelta(days=700),
        "maintenance_frequency": 2,
        "frequency_unit": "months",
        "next_maintenance_date": timezone.now().date() - timedelta(days=5),
        "notes": "Machine for producing tube ice. Showing reduced production capacity, requires maintenance.",
    },
]

# Maintenance types
MAINTENANCE_TYPES = ["scheduled", "emergency", "preventive", "corrective"]

# Issues that might be found
COMMON_ISSUES = [
    "Oil leak",
    "Refrigerant leak",
    "Unusual noise",
    "Vibration",
    "Low pressure",
    "High pressure",
    "Electrical issue",
    "Control malfunction",
    "Bearing wear",
    "Motor overheating",
    "Scale buildup",
    "Corrosion",
    "Valve issue",
    "Belt wear",
    "Pump cavitation",
]

# Parts that might be replaced
COMMON_PARTS = [
    "Oil filter",
    "Refrigerant filter",
    "Gasket",
    "O-ring",
    "Seal kit",
    "Bearing",
    "Belt",
    "Motor",
    "Contactor",
    "Pressure switch",
    "Temperature sensor",
    "Valve",
    "Pump seal",
    "Control board",
    "Timer",
]

# Actions taken during maintenance
COMMON_ACTIONS = [
    "Replaced worn parts",
    "Tightened loose connections",
    "Cleaned components",
    "Recalibrated sensors",
    "Adjusted settings",
    "Performed oil change",
    "Recharged refrigerant",
    "Cleaned condenser coils",
    "Checked electrical connections",
    "Verified safety controls",
    "Performed pressure test",
    "Lubricated bearings",
    "Updated control software",
    "Balanced system",
    "Performed thermal imaging inspection",
]

# Function to create a sample maintenance record
def create_maintenance_record(maintenance_item, date_offset):
    # Generate a realistic maintenance date in the past
    maintenance_date = timezone.now().date() - timedelta(days=date_offset)
    
    # Randomly select maintenance type with weighted probability
    maintenance_type = random.choices(
        MAINTENANCE_TYPES, 
        weights=[0.6, 0.1, 0.2, 0.1], 
        k=1
    )[0]
    
    # Generate random issues, parts, and actions
    num_issues = random.randint(0, 3)
    issues_found = "; ".join(random.sample(COMMON_ISSUES, num_issues)) if num_issues > 0 else "No issues found"
    
    num_parts = random.randint(0, 3)
    parts_replaced = "; ".join(random.sample(COMMON_PARTS, num_parts)) if num_parts > 0 else "No parts replaced"
    
    num_actions = random.randint(1, 3)
    actions = random.sample(COMMON_ACTIONS, num_actions)
    actions_taken = "; ".join(actions)
    
    # Generate random cost and duration
    cost = round(random.uniform(100, 2000), 2) if random.random() > 0.2 else 0
    duration = random.randint(1, 8)
    
    # Generate recommendations based on issues
    if num_issues > 0:
        recommendations = "Schedule follow-up inspection; Consider replacing aging components" if random.random() > 0.5 else "Continue regular maintenance schedule"
    else:
        recommendations = "Continue regular maintenance schedule"
    
    # Create the maintenance record
    record = MaintenanceRecord(
        maintenance_item=maintenance_item,
        maintenance_date=maintenance_date,
        maintenance_type=maintenance_type,
        performed_by=maintenance_user.get_full_name(),
        issues_found=issues_found,
        parts_replaced=parts_replaced,
        actions_taken=actions_taken,
        cost=cost,
        duration=duration,
        recommendations=recommendations,
        status="completed"
    )
    record.save()
    return record

def run():
    # Clear existing data if needed
    # MaintenanceRecord.objects.all().delete()
    # MaintenanceItem.objects.all().delete()
    
    print("Creating maintenance equipment and records...")
    
    # Create equipment items
    created_items = []
    for equipment in EQUIPMENT_DATA:
        item, created = MaintenanceItem.objects.get_or_create(
            equipment_name=equipment["equipment_name"],
            defaults=equipment
        )
        
        if created:
            created_items.append(item)
            print(f"Created: {item.equipment_name}")
        else:
            print(f"Already exists: {item.equipment_name}")
    
    # Create maintenance records for each item
    total_records = 0
    for item in created_items:
        # Create between 2 and 8 maintenance records for each item
        num_records = random.randint(2, 8)
        for i in range(num_records):
            # Offset days to create records in the past (30-500 days ago)
            date_offset = random.randint(30, 500)
            record = create_maintenance_record(item, date_offset)
            total_records += 1
    
    print(f"Created {len(created_items)} equipment items and {total_records} maintenance records.")

if __name__ == "__main__":
    run() 