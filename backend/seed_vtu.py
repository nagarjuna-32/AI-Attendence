import sys
import os

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.database import SessionLocal, engine
from backend.db.models import Base, Department, Course, Semester, Subject

def seed_data():
    db = SessionLocal()
    
    # 1. Departments to Add
    depts_data = [
        {"name": "Computer Science and Engineering", "code": "CSE"},
        {"name": "Information Science and Engineering", "code": "ISE"},
        {"name": "Artificial Intelligence and Machine Learning", "code": "AIML"},
        {"name": "Artificial Intelligence and Data Science", "code": "AIDS"},
        {"name": "Electronics and Communication Engineering", "code": "ECE"},
        {"name": "Electrical and Electronics Engineering", "code": "EEE"},
        {"name": "Mechanical Engineering", "code": "MECH"},
        {"name": "Civil Engineering", "code": "CIVIL"}
    ]
    
    # Pre-defined VTU subjects (approximation of 2021/2022 scheme)
    # First year is common for most (Chemistry cycle / Physics cycle)
    common_sem1 = [("MAT11", "Mathematics-I for Engineering"), ("PHY12", "Physics for Engineering"), ("ELE13", "Basic Electrical Engineering"), ("CIV14", "Elements of Civil Engineering"), ("EVS15", "Environmental Studies")]
    common_sem2 = [("MAT21", "Mathematics-II for Engineering"), ("CHE22", "Chemistry for Engineering"), ("ELN23", "Basic Electronics"), ("CPL24", "C Programming for Problem Solving"), ("ENG25", "Professional English")]
    
    branch_subjects = {
        "CSE": {
            3: [("CS31", "Data Structures and Applications"), ("CS32", "Analog and Digital Electronics"), ("CS33", "Computer Organization"), ("CS34", "Software Engineering")],
            4: [("CS41", "Design and Analysis of Algorithms"), ("CS42", "Microcontroller and Embedded Systems"), ("CS43", "Operating Systems"), ("CS44", "Data Communication")],
            5: [("CS51", "Automata Theory and Computability"), ("CS52", "Computer Networks"), ("CS53", "Database Management Systems"), ("CS54", "Artificial Intelligence")],
            6: [("CS61", "System Software and Compilers"), ("CS62", "Computer Graphics and Visualization"), ("CS63", "Web Technology and its applications"), ("CS64", "Data Mining")],
            7: [("CS71", "Machine Learning"), ("CS72", "Big Data Analytics"), ("CS73", "Cloud Computing"), ("CS74", "Cryptography")],
            8: [("CS81", "Internet of Things"), ("CS82", "Project Work"), ("CS83", "Technical Seminar"), ("CS84", "Internship")]
        },
        "ISE": {
            3: [("IS31", "Data Structures and Applications"), ("IS32", "Analog and Digital Electronics"), ("IS33", "Computer Organization"), ("IS34", "Software Engineering")],
            4: [("IS41", "Design and Analysis of Algorithms"), ("IS42", "Microcontroller and Embedded Systems"), ("IS43", "Operating Systems"), ("IS44", "Data Communication")],
            5: [("IS51", "Automata Theory and Computability"), ("IS52", "Computer Networks"), ("IS53", "Database Management Systems"), ("IS54", "Application Development using Python")],
            6: [("IS61", "File Structures"), ("IS62", "Software Testing"), ("IS63", "Web Technology and its applications"), ("IS64", "Information Storage")],
            7: [("IS71", "Machine Learning"), ("IS72", "Big Data Analytics"), ("IS73", "Cloud Computing"), ("IS74", "Cryptography")],
            8: [("IS81", "Internet of Things"), ("IS82", "Project Work"), ("IS83", "Technical Seminar"), ("IS84", "Internship")]
        },
        "AIML": {
            3: [("AI31", "Data Structures and Applications"), ("AI32", "Principles of Artificial Intelligence"), ("AI33", "Computer Organization"), ("AI34", "Operating Systems")],
            4: [("AI41", "Design and Analysis of Algorithms"), ("AI42", "Machine Learning Foundations"), ("AI43", "Database Management Systems"), ("AI44", "Python Programming")],
            5: [("AI51", "Deep Learning"), ("AI52", "Computer Networks"), ("AI53", "Natural Language Processing"), ("AI54", "Big Data Analytics")],
            6: [("AI61", "Computer Vision"), ("AI62", "Reinforcement Learning"), ("AI63", "Web Technology"), ("AI64", "Data Mining")],
            7: [("AI71", "Advanced AI"), ("AI72", "Time Series Analysis"), ("AI73", "Cloud Computing"), ("AI74", "AI Ethics")],
            8: [("AI81", "Robotics"), ("AI82", "Project Work"), ("AI83", "Technical Seminar"), ("AI84", "Internship")]
        },
        "AIDS": {
            3: [("AD31", "Data Structures and Applications"), ("AD32", "Data Science Principles"), ("AD33", "Computer Organization"), ("AD34", "Operating Systems")],
            4: [("AD41", "Design and Analysis of Algorithms"), ("AD42", "Machine Learning Foundations"), ("AD43", "Database Management Systems"), ("AD44", "Python for Data Science")],
            5: [("AD51", "Deep Learning"), ("AD52", "Data Wrangling"), ("AD53", "Natural Language Processing"), ("AD54", "Big Data Analytics")],
            6: [("AD61", "Predictive Analytics"), ("AD62", "Data Visualization"), ("AD63", "Web Technology"), ("AD64", "Data Mining")],
            7: [("AD71", "Advanced Machine Learning"), ("AD72", "Time Series Analysis"), ("AD73", "Cloud Computing"), ("AD74", "Data Privacy")],
            8: [("AD81", "Business Intelligence"), ("AD82", "Project Work"), ("AD83", "Technical Seminar"), ("AD84", "Internship")]
        },
        "ECE": {
            3: [("EC31", "Network Analysis"), ("EC32", "Electronic Devices"), ("EC33", "Digital System Design"), ("EC34", "Signals and Systems")],
            4: [("EC41", "Analog Circuits"), ("EC42", "Microcontrollers"), ("EC43", "Control Systems"), ("EC44", "Engineering Statistics")],
            5: [("EC51", "Digital Signal Processing"), ("EC52", "Information Theory and Coding"), ("EC53", "Electromagnetic Waves"), ("EC54", "Verilog HDL")],
            6: [("EC61", "Digital Communication"), ("EC62", "ARM Microcontroller"), ("EC63", "VLSI Design"), ("EC64", "Computer Networks")],
            7: [("EC71", "Microwave and Antennas"), ("EC72", "Image Processing"), ("EC73", "Power Electronics"), ("EC74", "Cryptography")],
            8: [("EC81", "Wireless Communication"), ("EC82", "Project Work"), ("EC83", "Technical Seminar"), ("EC84", "Internship")]
        },
        "EEE": {
            3: [("EE31", "Electric Circuit Analysis"), ("EE32", "Transformers and Generators"), ("EE33", "Analog Electronic Circuits"), ("EE34", "Digital System Design")],
            4: [("EE41", "Power Generation and Economics"), ("EE42", "Transmission and Distribution"), ("EE43", "Microcontrollers"), ("EE44", "Electromagnetic Field Theory")],
            5: [("EE51", "Management and Entrepreneurship"), ("EE52", "Microcontroller"), ("EE53", "Power Electronics"), ("EE54", "Signals and Systems")],
            6: [("EE61", "Control Systems"), ("EE62", "Power System Analysis 1"), ("EE63", "Digital Signal Processing"), ("EE64", "Electrical Machine Design")],
            7: [("EE71", "Power System Analysis 2"), ("EE72", "Power System Protection"), ("EE73", "High Voltage Engineering"), ("EE74", "Utilization of Electrical Power")],
            8: [("EE81", "Smart Grid"), ("EE82", "Project Work"), ("EE83", "Technical Seminar"), ("EE84", "Internship")]
        },
        "MECH": {
            3: [("ME31", "Material Science"), ("ME32", "Basic Thermodynamics"), ("ME33", "Mechanics of Materials"), ("ME34", "Metal Casting and Welding")],
            4: [("ME41", "Applied Thermodynamics"), ("ME42", "Fluid Mechanics"), ("ME43", "Kinematics of Machines"), ("ME44", "Machining Processes")],
            5: [("ME51", "Management and Economics"), ("ME52", "Dynamics of Machines"), ("ME53", "Turbo Machines"), ("ME54", "Design of Machine Elements I")],
            6: [("ME61", "Finite Element Methods"), ("ME62", "Design of Machine Elements II"), ("ME63", "Heat Transfer"), ("ME64", "Manufacturing Process")],
            7: [("ME71", "Energy Engineering"), ("ME72", "Fluid Power Systems"), ("ME73", "Control Engineering"), ("ME74", "Mechatronics")],
            8: [("ME81", "Operations Research"), ("ME82", "Project Work"), ("ME83", "Technical Seminar"), ("ME84", "Internship")]
        },
        "CIVIL": {
            3: [("CV31", "Strength of Materials"), ("CV32", "Fluid Mechanics"), ("CV33", "Building Materials"), ("CV34", "Basic Surveying")],
            4: [("CV41", "Analysis of Determinate Structures"), ("CV42", "Applied Hydraulics"), ("CV43", "Concrete Technology"), ("CV44", "Advanced Surveying")],
            5: [("CV51", "Design of RC Structural Elements"), ("CV52", "Analysis of Indeterminate Structures"), ("CV53", "Applied Geotechnical Engineering"), ("CV54", "Highway Engineering")],
            6: [("CV61", "Design of Steel Structural Elements"), ("CV62", "Water Supply Engineering"), ("CV63", "Alternative Building Materials"), ("CV64", "Matrix Method of Structural Analysis")],
            7: [("CV71", "Municipal and Industrial Waste Water"), ("CV72", "Design of RCC and Steel Structures"), ("CV73", "Hydrology"), ("CV74", "Urban Transport Planning")],
            8: [("CV81", "Quantity Surveying"), ("CV82", "Project Work"), ("CV83", "Technical Seminar"), ("CV84", "Internship")]
        }
    }

    try:
        print("Starting Database Seed...")
        for d in depts_data:
            # 1. Add Department
            dept = db.query(Department).filter_by(code=d['code']).first()
            if not dept:
                dept = Department(name=d['name'], code=d['code'])
                db.add(dept)
                db.commit()
                db.refresh(dept)
                print(f"Added Department: {dept.name}")
            else:
                print(f"Department exists: {dept.name}")

            # 2. Add Course
            course_name = "Bachelor of Engineering"
            course = db.query(Course).filter_by(department_id=dept.id, name=course_name).first()
            if not course:
                course = Course(department_id=dept.id, name=course_name)
                db.add(course)
                db.commit()
                db.refresh(course)
                print(f"  Added Course: {course.name}")
            else:
                print(f"  Course exists: {course.name}")

            # 3. Add Semesters 1-8
            for sem_num in range(1, 9):
                sem = db.query(Semester).filter_by(course_id=course.id, number=sem_num).first()
                if not sem:
                    sem = Semester(course_id=course.id, number=sem_num)
                    db.add(sem)
                    db.commit()
                    db.refresh(sem)
                    print(f"    Added Semester: {sem.number}")
                
                # 4. Add Subjects
                subs_to_add = []
                if sem_num == 1:
                    subs_to_add = common_sem1
                elif sem_num == 2:
                    subs_to_add = common_sem2
                else:
                    subs_to_add = branch_subjects.get(dept.code, {}).get(sem_num, [])

                for sub_code, sub_name in subs_to_add:
                    # Append branch code to 1st year subjects to make codes unique per semester if needed
                    # VTU codes are technically unique, but to avoid global unique constraint conflicts 
                    # if they are already in the DB from another branch, we make it unique.
                    actual_code = f"{dept.code}-{sub_code}" if sem_num in [1, 2] else sub_code
                    
                    sub = db.query(Subject).filter_by(code=actual_code).first()
                    if not sub:
                        sub = Subject(semester_id=sem.id, code=actual_code, name=sub_name)
                        db.add(sub)
                        db.commit()
                        print(f"      Added Subject: {sub.name} ({sub.code})")

        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
