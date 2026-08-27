import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'appraisal_system.settings')
django.setup()

from appraisal.models import Employee, Appraisal

updates_data = [
    ("007572", "NA/AHA"),
    ("006259", "NA/ANNEX - MDICU"),
    ("006884", "NA/ANNEX - MDICU"),
    ("004199", "NA/CCU"),
    ("005261", "NA/CCU"),
    ("007234", "NA/CCU"),
    ("001248", "NA/DC-JDT"),
    ("008532", "NA/DC-JDT"),
    ("008746", "NA/DC-JDT"),
    ("008975", "NA/DC-JDT"),
    ("007055", "NA/DIALYSIS UNIT"),
    ("008529", "NA/DIALYSIS UNIT"),
    ("008531", "NA/DIALYSIS UNIT"),
    ("008541", "NA/DIALYSIS UNIT"),
    ("008886", "NA/DIALYSIS UNIT"),
    ("008887", "NA/DIALYSIS UNIT"),
    ("008979", "NA/DIALYSIS UNIT"),
    ("009685", "NA/DIALYSIS UNIT"),
    ("007335", "NA/EMERGENCY UNIT"),
    ("007417", "NA/EMERGENCY UNIT"),
    ("007271", "NA/GASTROENTEROLOGY"),
    ("004373", "NA/GENERAL PROCEDURE ROOM"),
    ("004498", "NA/GENERAL PROCEDURE ROOM"),
    ("007795", "NA/GENERAL WARD FEMALE"),
    ("007866", "NA/GENERAL WARD FEMALE"),
    ("008538", "NA/GENERAL WARD FEMALE"),
    ("004388", "NA/GENERAL WARD MALE"),
    ("007021", "NA/GENERAL WARD MALE"),
    ("007237", "NA/GENERAL WARD MALE"),
    ("007261", "NA/GENERAL WARD MALE"),
    ("000907", "NA/IKC - NS 4"),
    ("005632", "NA/IKC - NS 4"),
    ("005928", "NA/IKC - NS 4"),
    ("007685", "NA/IKC - NS 4"),
    ("004387", "NA/IKC - NS 5"),
    ("004736", "NA/IKC - NS 5"),
    ("006163", "NA/IKC - NS 5"),
    ("007034", "NA/IKC - NS 5"),
    ("005006", "NA/IKC - NS 6"),
    ("007270", "NA/IKC - NS 6"),
    ("007272", "NA/IKC - NS 6"),
    ("008833", "NA/IKC - NS 6"),
    ("000191", "NA/ILC- GW1"),
    ("000428", "NA/ILC- GW1"),
    ("005011", "NA/ILC- GW1"),
    ("006428", "NA/ILC- GW1"),
    ("000483", "NA/ILC- GW2"),
    ("000523", "NA/ILC- GW2"),
    ("000808", "NA/ILC- GW2")
]

def run():
    print(f"Total staff location updates requested: {len(updates_data)}")
    updated_count = 0
    not_found = []
    
    for emp_code, new_location in updates_data:
        try:
            emp = Employee.objects.get(employee_code=emp_code)
            old_location = emp.location
            emp.location = new_location
            emp.save()
            updated_count += 1
            print(f"Updated {emp_code} - {emp.name}: '{old_location}' -> '{new_location}'")
            
            # Also update any appraisals if location field exists on Appraisal
            if hasattr(Appraisal, 'location'):
                Appraisal.objects.filter(employee_code=emp_code).update(location=new_location)
        except Employee.DoesNotExist:
            not_found.append(emp_code)
            print(f"WARNING: Employee code {emp_code} not found in database.")

    print(f"\n--- Update Complete ---")
    print(f"Successfully updated: {updated_count} employees.")
    if not_found:
        print(f"Employees not found: {len(not_found)}: {not_found}")

if __name__ == '__main__':
    run()
