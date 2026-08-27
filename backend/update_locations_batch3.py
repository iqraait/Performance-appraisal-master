import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'appraisal_system.settings')
django.setup()

from appraisal.models import Employee, Appraisal

updates_data = [
    ("000030", "NA/OPD"),
    ("000105", "NA/OPD"),
    ("000122", "NA/OPD"),
    ("000135", "NA/OPD"),
    ("000802", "NA/OPD"),
    ("000902", "NA/OPD"),
    ("000999", "NA/OPD"),
    ("001097", "NA/OPD"),
    ("001194", "NA/OPD"),
    ("001299", "NA/OPD"),
    ("001307", "NA/OPD"),
    ("001368", "NA/OPD"),
    ("001374", "NA/OPD"),
    ("001405", "NA/OPD"),
    ("001546", "NA/OPD"),
    ("001745", "NA/OPD"),
    ("001979", "NA/OPD"),
    ("002034", "NA/OPD"),
    ("004023", "NA/OPD"),
    ("004098", "NA/OPD"),
    ("004100", "NA/OPD"),
    ("004389", "NA/OPD"),
    ("004674", "NA/OPD"),
    ("004675", "NA/OPD"),
    ("004774", "NA/OPD"),
    ("005330", "NA/OPD"),
    ("005339", "NA/OPD"),
    ("005719", "NA/OPD"),
    ("006182", "NA/OPD"),
    ("006347", "NA/OPD"),
    ("006651", "NA/OPD"),
    ("007094", "NA/OPD"),
    ("007297", "NA/OPD"),
    ("007322", "NA/OPD"),
    ("007472", "NA/OPD"),
    ("008192", "NA/OPD"),
    ("008399", "NA/OPD"),
    ("008464", "NA/OPD"),
    ("008537", "NA/OPD"),
    ("008547", "NA/OPD"),
    ("008675", "NA/OPD"),
    ("008676", "NA/OPD"),
    ("008698", "NA/OPD"),
    ("008699", "NA/OPD"),
    ("009509", "NA/OPD"),
    ("009510", "NA/OPD")
]

def run():
    print(f"Total staff location updates in Batch 3: {len(updates_data)}")
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
            
            if hasattr(Appraisal, 'location'):
                Appraisal.objects.filter(employee_code=emp_code).update(location=new_location)
        except Employee.DoesNotExist:
            not_found.append(emp_code)
            print(f"WARNING: Employee code {emp_code} not found in database.")

    print(f"\n--- Batch 3 Update Complete ---")
    print(f"Successfully updated: {updated_count} employees.")
    if not_found:
        print(f"Employees not found ({len(not_found)}): {not_found}")

if __name__ == '__main__':
    run()
