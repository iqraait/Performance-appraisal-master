import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'appraisal_system.settings')
django.setup()

from appraisal.models import Employee, Appraisal

updates_data = [
    ("000032", "NA/OPERATION THEATRE"),
    ("000437", "NA/OPERATION THEATRE"),
    ("004354", "NA/OPERATION THEATRE"),
    ("004503", "NA/OPERATION THEATRE"),
    ("005176", "NA/OPERATION THEATRE"),
    ("005190", "NA/OPERATION THEATRE"),
    ("005906", "NA/OPERATION THEATRE"),
    ("007299", "NA/OPERATION THEATRE"),
    ("007512", "NA/OPERATION THEATRE"),
    ("007520", "NA/OPERATION THEATRE"),
    ("000908", "NA/ORTHO WARD"),
    ("007243", "NA/ORTHO WARD"),
    ("008834", "NA/ORTHO WARD"),
    ("008852", "NA/ORTHO WARD"),
    ("006638", "NA/PALLIATIVE CARE UNIT"),
    ("007191", "NA/PALLIATIVE CARE UNIT"),
    ("008150", "NA/PALLIATIVE CARE UNIT"),
    ("008413", "NA/PALLIATIVE CARE UNIT"),
    ("008454", "NA/PALLIATIVE CARE UNIT"),
    ("008785", "NA/PALLIATIVE CARE UNIT"),
    ("008799", "NA/PALLIATIVE CARE UNIT"),
    ("005859", "NA/POST INTENSIVE CARE WARD"),
    ("006059", "NA/POST INTENSIVE CARE WARD"),
    ("007333", "NA/POST INTENSIVE CARE WARD"),
    ("007334", "NA/POST INTENSIVE CARE WARD"),
    ("007454", "NA/POST INTENSIVE CARE WARD"),
    ("007628", "NA/POST INTENSIVE CARE WARD"),
    ("000504", "NA/PREOPERATIVE WARD"),
    ("000138", "NA/PSYCHIATRIC CARE UNIT"),
    ("000376", "NA/PSYCHIATRIC CARE UNIT"),
    ("007172", "NA/PSYCHIATRIC CARE UNIT"),
    ("007976", "NA/PSYCHIATRIC CARE UNIT"),
    ("008248", "NA/PSYCHIATRIC CARE UNIT"),
    ("008981", "NA/PSYCHIATRIC CARE UNIT"),
    ("000379", "NA/RADIOLOGY NURSING SERVICES"),
    ("001160", "NA/RADIOLOGY NURSING SERVICES"),
    ("002042", "NA/RADIOLOGY NURSING SERVICES"),
    ("004370", "NA/RADIOLOGY NURSING SERVICES"),
    ("005465", "NA/RADIOLOGY NURSING SERVICES"),
    ("006516", "NA/RADIOLOGY NURSING SERVICES"),
    ("006934", "NA/RADIOLOGY NURSING SERVICES"),
    ("006935", "NA/RADIOLOGY NURSING SERVICES"),
    ("008238", "NA/RADIOLOGY NURSING SERVICES"),
    ("008300", "NA/RADIOLOGY NURSING SERVICES"),
    ("008637", "NA/RADIOLOGY NURSING SERVICES"),
    ("008789", "NA/RADIOLOGY NURSING SERVICES"),
    ("009643", "NA/RADIOLOGY NURSING SERVICES"),
    ("000039", "NA/S BLOCK-HDU"),
    ("000131", "NA/S BLOCK-HDU"),
    ("001907", "NA/S BLOCK-HDU"),
    ("009696", "NA/S BLOCK-HDU"),
    ("001009", "NA/SICU -1"),
    ("007307", "NA/SICU -1"),
    ("007084", "NA/SW 1"),
    ("007133", "NA/SW 1"),
    ("007139", "NA/SW 1"),
    ("007376", "NA/SW 3"),
    ("007675", "NA/SW 3"),
    ("008831", "NA/SW 3")
]

def run():
    print(f"Total staff location updates in Batch 4: {len(updates_data)}")
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

    print(f"\n--- Batch 4 Update Complete ---")
    print(f"Successfully updated: {updated_count} employees.")
    if not_found:
        print(f"Employees not found ({len(not_found)}): {not_found}")

if __name__ == '__main__':
    run()
