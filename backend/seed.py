import json
import datetime
from database import engine, SessionLocal, Base
import models
import auth

def run_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Tenant
        tenant = db.query(models.Tenant).filter(models.Tenant.sdom == "ezexamqwertyuiop").first()
        if not tenant:
            tenant = models.Tenant(
                sdom="ezexamqwertyuiop",
                name="Apex Premier Academy",
                title="EZexam - Online Examination System"
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print("[OK] Tenant seeded: ezexamqwertyuiop")

        # 2. Admin User
        admin = db.query(models.User).filter(models.User.email == "ezexam@yopmail.com").first()
        if not admin:
            admin = models.User(
                tenant_id=tenant.id,
                username="ezexamqwertyuiop",
                email="ezexam@yopmail.com",
                phone="9876543210",
                password_hash=auth.hash_password("qwertyuiop"),
                role="admin"
            )
            db.add(admin)
            db.commit()
            print("[OK] Admin seeded: ezexam@yopmail.com (qwertyuiop)")

        # 3. Student User
        student = db.query(models.User).filter(models.User.email == "student@ezexam.local").first()
        if not student:
            student = models.User(
                tenant_id=tenant.id,
                username="Rahul Sharma",
                email="student@ezexam.local",
                phone="9123456789",
                rollnum="STU-2026-001",
                password_hash=auth.hash_password("password123"),
                role="student",
                branch="JEE-Main",
                centre="North Campus"
            )
            db.add(student)
            db.commit()
            print("[OK] Student seeded: student@ezexam.local (password123)")

        # 3b. Academic Structure Seed
        if db.query(models.Centre).filter(models.Centre.tenant_id == tenant.id).count() == 0:
            c1 = models.Centre(tenant_id=tenant.id, name="Main Campus", code="MC-01", address="Building A, Tech Park")
            c2 = models.Centre(tenant_id=tenant.id, name="North Annex", code="NA-02", address="Sector 4, Academic City")
            db.add_all([c1, c2])
            db.commit()
            print("[OK] Default centres seeded.")

        if db.query(models.Branch).filter(models.Branch.tenant_id == tenant.id).count() == 0:
            b1 = models.Branch(tenant_id=tenant.id, name="JEE-Main", code="JM-26")
            b2 = models.Branch(tenant_id=tenant.id, name="NEET-UG", code="NU-26")
            b3 = models.Branch(tenant_id=tenant.id, name="Foundation-Batch", code="FB-26")
            db.add_all([b1, b2, b3])
            db.commit()
            print("[OK] Default branches seeded.")

        if db.query(models.Subject).filter(models.Subject.tenant_id == tenant.id).count() == 0:
            s1 = models.Subject(tenant_id=tenant.id, name="Physics", code="PHY")
            s2 = models.Subject(tenant_id=tenant.id, name="Chemistry", code="CHEM")
            s3 = models.Subject(tenant_id=tenant.id, name="Mathematics", code="MATH")
            s4 = models.Subject(tenant_id=tenant.id, name="Biology", code="BIO")
            db.add_all([s1, s2, s3, s4])
            db.commit()
            print("[OK] Default subjects seeded.")

        # 4. Question Paper
        qpap = db.query(models.QuestionPaper).filter(models.QuestionPaper.name == "JEE Main & Advanced Full Mock 2026").first()
        if not qpap:
            qpap = models.QuestionPaper(
                tenant_id=tenant.id,
                name="JEE Main & Advanced Full Mock 2026",
                subjects="Physics, Chemistry, Mathematics",
                exam_type="JEE-Main",
                duration_mins=180,
                status="ACTIVE",
                created_by="ezexamqwertyuiop"
            )
            db.add(qpap)
            db.commit()
            db.refresh(qpap)

            # Sample questions
            questions = [
                models.Question(
                    qpap_id=qpap.id,
                    qno=1,
                    type="SINGLE_CORRECT",
                    subj="Physics",
                    qtxt="A block of mass 2 kg is placed on a rough horizontal surface with coefficient of friction μ = 0.4. If a horizontal force of 6 N is applied on the block, what is the magnitude of frictional force acting on it? (Take g = 10 m/s²)",
                    options_json=json.dumps(["8 N", "6 N", "0 N", "2 N"]),
                    key_json=json.dumps(["6 N"]),
                    cmk=4.0,
                    imk=-1.0,
                    diff="MEDIUM",
                    topic="Laws of Motion"
                ),
                models.Question(
                    qpap_id=qpap.id,
                    qno=2,
                    type="MULTI_CORRECT",
                    subj="Chemistry",
                    qtxt="Which of the following molecules possess a planar molecular geometry?",
                    options_json=json.dumps(["XeF4", "BF3", "CH4", "SF4"]),
                    key_json=json.dumps(["XeF4", "BF3"]),
                    cmk=4.0,
                    imk=-1.0,
                    diff="HARD",
                    topic="Chemical Bonding"
                ),
                models.Question(
                    qpap_id=qpap.id,
                    qno=3,
                    type="NUMERICAL",
                    subj="Mathematics",
                    qtxt="Evaluate the definite integral: ∫ from 0 to 1 of (3x² + 2x + 1) dx. Enter the exact integer value.",
                    options_json=json.dumps([]),
                    key_json=json.dumps(["3"]),
                    cmk=4.0,
                    imk=0.0,
                    diff="EASY",
                    topic="Calculus"
                ),
                models.Question(
                    qpap_id=qpap.id,
                    qno=4,
                    type="SINGLE_CORRECT",
                    subj="Physics",
                    qtxt="In an electromagnetic wave traveling along +x axis, if the electric field vector is oscillating along +y axis, along which direction does the magnetic field vector oscillate?",
                    options_json=json.dumps(["+z axis", "-z axis", "+y axis", "+x axis"]),
                    key_json=json.dumps(["+z axis"]),
                    cmk=4.0,
                    imk=-1.0,
                    diff="EASY",
                    topic="Electromagnetism"
                ),
                models.Question(
                    qpap_id=qpap.id,
                    qno=5,
                    type="TRUE_FALSE",
                    subj="Chemistry",
                    qtxt="State whether true or false: The first ionization enthalpy of Nitrogen is higher than that of Oxygen due to the extra stability of half-filled 2p subshell.",
                    options_json=json.dumps(["True", "False"]),
                    key_json=json.dumps(["True"]),
                    cmk=3.0,
                    imk=-1.0,
                    diff="EASY",
                    topic="Periodic Classification"
                )
            ]
            db.add_all(questions)
            db.commit()
            print("[OK] Question paper and 5 mock questions seeded.")

        # 5. Exam Schedule
        exam = db.query(models.ExamSchedule).filter(models.ExamSchedule.name == "All India Mock Test 1").first()
        if not exam:
            exam = models.ExamSchedule(
                tenant_id=tenant.id,
                qpap_id=qpap.id,
                name="All India Mock Test 1",
                stime="2026-10-21 00:00",
                etime="2026-10-31 23:59",
                mins=180,
                status="RUNNING",
                shuf=True,
                cam=False,
                switches=True,
                num_switches=3,
                branches="JEE-Main",
                centres="All",
                created_by="ezexamqwertyuiop"
            )
            db.add(exam)
            db.commit()
            print("[OK] Scheduled exam seeded: All India Mock Test 1 (ID: 1)")

    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
