from openpyxl.xml._functions_overloads import _HasTag
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'appraisal_system.settings')
django.setup()

from appraisal.models import Employee, Appraisal

updates_data = [
    ("000406", "NA/ILC- GW3"),
    ("001404", "NA/ILC- NS 6"),
    ("001543", "NA/ILC- NS 6"),
    ("004756", "NA/ILC- NS 6"),
    ("007602", "NA/ILC- NS 6"),
    ("000522", "NA/IQRAA  COMMUNITY CLINIC-KALLAI"),
    ("004878", "NA/IQRAA  COMMUNITY      CLINIC-KALLAI"),
    ("007626", "NA/IQRAA COMMUNITY CLINIC ,PALAZHI"),
    ("004520", "NA/IQRAA FOOT CARE CLINIC"),
    ("007648", "NA/IQRAA FOOT CARE CLINIC"),
    ("007130", "NA/IQRAA SPECIALTY CLINIC ADDRESS MALL"),
    ("000040", "NA/LABOUR ROOM"),
    ("000047", "NA/LABOUR ROOM"),
    ("000610", "NA/LABOUR ROOM"),
    ("000860", "NA/LABOUR ROOM"),
    ("004668", "NA/LABOUR ROOM"),
    ("005848", "NA/LABOUR ROOM"),
    ("005922", "NA/MDICU 1"),
    ("006883", "NA/MDICU 1"),
    ("006901", "NA/MDICU 1"),
    ("006910", "NA/MDICU 1"),
    ("009644", "NA/MDICU 1"),
    ("001545", "NA/MDICU 2"),
    ("006885", "NA/MDICU 2"),
    ("007657", "NA/MDICU 2"),
    ("006456", "NA/MDICU 3"),
    ("006472", "NA/MDICU 3"),
    ("007308", "NA/MDICU 3"),
    ("007309", "NA/MDICU 3"),
    ("007658", "NA/MDICU 3"),
    ("004363", "NA/MINOR PROCEDURE ROOM"),
    ("004437", "NA/MINOR PROCEDURE ROOM"),
    ("004461", "NA/MINOR PROCEDURE ROOM"),
    ("004658", "NA/MINOR PROCEDURE ROOM"),
    ("004909", "NA/MINOR PROCEDURE ROOM"),
    ("004917", "NA/MINOR PROCEDURE ROOM"),
    ("005010", "NA/MINOR PROCEDURE ROOM"),
    ("005083", "NA/MINOR PROCEDURE ROOM"),
    ("005699", "NA/MINOR PROCEDURE ROOM"),
    ("007150", "NA/MINOR PROCEDURE ROOM"),
    ("007287", "NA/MINOR PROCEDURE ROOM"),
    ("007438", "NA/MINOR PROCEDURE ROOM"),
    ("007679", "NA/MINOR PROCEDURE ROOM"),
    ("008382", "NA/MINOR PROCEDURE ROOM"),
    ("009695", "NA/MINOR PROCEDURE ROOM"),
    ("007073", "NA/NEURO ICU"),
    ("007582", "NA/NEURO ICU"),
    ("000424", "NA/NICU"),
    ("007027", "NA/NICU"),
    ("007028", "NA/NICU"),
    ("007774", "NA/NS1"),
    ("007134", "NA/NS2"),
    ("007377", "NA/NS2"),
    ("007865", "NA/NS2"),
    ("008313", "NA/NS2"),
    ("007579", "NA/NS4"),
    ("007870", "NA/NS4"),
    ("008363", "NA/NS4"),
    ("008695", "NA/NS4"),
    ("008832", "NA/NS4")
]

def run():
    print(f"Total staff location updates in Batch 2: {len(updates_data)}")
    updated_count = 0
    not_found = []
    
    for emp_code, new_location in updates_data:
        try:
            emp = Employee.objects.get(employee_code=emp_code)
            old_location = emp.location
            emp.location = new_locationl
            emp.save()
            updated_count += 1
            print(f"Updated {emp_code} - {emp.name}: '{old_location}' -> '{new_location}'")
            
            if hasattr(Appraisal, 'location'):
                Appraisal.objects.filter(employee_code=emp_code).update(location=new_location)
        except Employee.DoesNotExist:
            not_found.append(emp_code)
            print(f"WARNING: Employee code {emp_code} not found in database.")

    print(f"\n--- Batch 2 Update Complete ---")
    print(f"Successfully updated: {updated_count} employees.")
    if not_found:
        print(f"Employees not found ({len(not_found)}): {not_found}")

if __name__ == '__main__':
    run()
