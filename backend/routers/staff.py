import json
import datetime
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Form, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models
import auth

router = APIRouter(prefix="/staff", tags=["Staff Portal APIs"])

def get_staff_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.cookies.get("sessionid") or request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in ["admin", "faculty", "chead"]:
        raise HTTPException(status_code=403, detail="Staff access forbidden for this account")
    return user


@router.post("/get_cap")
def get_capacity(user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """Matches the exact shape of /staff/get_cap observed in production"""
    stud_count = db.query(models.User).filter(
        models.User.tenant_id == user.tenant_id,
        models.User.role == "student"
    ).count()

    total_subm = db.query(models.ExamAttempt).join(models.ExamSchedule).filter(
        models.ExamSchedule.tenant_id == user.tenant_id,
        models.ExamAttempt.status == "SUBMITTED"
    ).count()

    return {
        "paid": True,
        "creds": 10000,
        "atmpts": 5000,
        "cap_left": 4500,
        "total_subm": total_subm,
        "omrs": 250,
        "valid_till": "2028-12-31",
        "legacy": False,
        "studs": max(stud_count, 1)
    }


@router.post("/get_qexams_paging")
async def get_qexams_paging(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """Matches the exact shape of /staff/get_qexams_paging observed in production"""
    exams = db.query(models.ExamSchedule).filter(models.ExamSchedule.tenant_id == user.tenant_id).all()
    
    data = []
    for ex in exams:
        data.append({
            "name": ex.name,
            "stime": ex.stime,
            "etime": ex.etime,
            "swith": ex.branches,
            "status": ex.status,
            "crby": ex.created_by,
            "cron": str(ex.created_at)[:10],
            "surl": f"/exam/{ex.id}",
            "groups": ex.branches,
            "cents": ex.centres,
            "stans": "Class 12",
            "mins": ex.mins,
            "qpap": ex.qpap_id,
            "id": ex.id,
            "shuf": ex.shuf,
            "cam": ex.cam,
            "hide_qs": ex.hide_qs,
            "hide_res": ex.hide_res,
            "hide_anal": ex.hide_anal,
            "hide_rank": ex.hide_rank,
            "pc_only": ex.pc_only,
            "prac": ex.prac,
            "sec_skip": ex.sec_skip,
            "year": None,
            "ezomr": False
        })

    return {
        "data": data,
        "itemsCount": len(data)
    }


@router.post("/get_qexams")
def get_qexams(user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """Matches /staff/get_qexams"""
    exams = db.query(models.ExamSchedule).filter(models.ExamSchedule.tenant_id == user.tenant_id).all()
    qexams_list = []
    for ex in exams:
        num_res = db.query(models.ExamAttempt).filter(
            models.ExamAttempt.exam_id == ex.id,
            models.ExamAttempt.status == "SUBMITTED"
        ).count()
        qexams_list.append({
            "id": ex.id,
            "name": ex.name,
            "mins": ex.mins,
            "num_res": num_res,
            "qpap": ex.qpap_id,
            "date": ex.stime[:10],
            "type": "CBT",
            "status": ex.status,
            "num_swics": ex.num_switches,
            "shared": True,
            "from": [ex.created_by],
            "to": [ex.branches],
            "running": ex.status == "RUNNING",
            "swith": ex.branches,
            "branches": ex.branches,
            "classes": "Class 12",
            "centres": ex.centres,
            "is_ezomr": False,
            "num_atts": num_res,
            "full_pdf": "",
            "b2c": False
        })
    return {
        "qexams": qexams_list,
        "num_qexs": len(qexams_list),
        "status": "SUCCESS"
    }


@router.post("/get_onexs")
def get_onexs(user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """Matches /staff/get_onexs"""
    exams = db.query(models.ExamSchedule).filter(models.ExamSchedule.tenant_id == user.tenant_id).all()
    onexs = []
    for ex in exams:
        onexs.append({
            "id": str(ex.id),
            "name": ex.name,
            "qpap": str(ex.qpap_id),
            "stime": ex.stime,
            "etime": ex.etime,
            "dura": str(ex.mins),
            "groups": ex.branches,
            "cents": ex.centres,
            "stans": "Class 12",
            "shuf": ex.shuf,
            "cam": ex.cam,
            "hide_qs": ex.hide_qs,
            "hide_res": ex.hide_res,
            "hide_anal": ex.hide_anal,
            "hide_rank": ex.hide_rank,
            "pc_only": ex.pc_only,
            "prac": ex.prac,
            "sec_skip": ex.sec_skip,
            "num_swics": ex.num_switches
        })
    return {
        "onexs": onexs,
        "b2c_onexids": [],
        "status": "SUCCESS"
    }


@router.post("/add_onex")
async def add_onex(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """Create or schedule an online exam"""
    data = {}
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    qpap_id = int(data.get("qpap", 1) or 1)
    name = data.get("name", "New Examination")
    stime = data.get("stime") or f"{data.get('date', '2026-10-22')} {data.get('time', '09:00')}"
    etime = data.get("etime") or f"{data.get('end-date', '2026-10-22')} {data.get('end-time', '21:00')}"
    mins = int(data.get("mins", 180) or 180)
    shuf = bool(data.get("shuf", True))
    cam = bool(data.get("cam", False))
    pc_only = bool(data.get("pc_only", False))
    switches = bool(data.get("switches", True))
    num_switches = int(data.get("num_switches", 3) or 3)

    exam = models.ExamSchedule(
        tenant_id=user.tenant_id,
        qpap_id=qpap_id,
        name=name,
        stime=stime,
        etime=etime,
        mins=mins,
        status="SCHEDULED",
        shuf=shuf,
        cam=cam,
        pc_only=pc_only,
        switches=switches,
        num_switches=num_switches,
        branches=str(data.get("branches", "All")),
        centres=str(data.get("centres", "Main")),
        created_by=user.username
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    return {
        "status": "SUCCESS",
        "exam_id": exam.id,
        "message": "Exam scheduled successfully"
    }


@router.post("/del_onex")
async def del_onex(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    form = await request.form()
    exam_id = int(form.get("id") or form.get("exid", 0))
    exam = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.id == exam_id,
        models.ExamSchedule.tenant_id == user.tenant_id
    ).first()
    if exam:
        db.delete(exam)
        db.commit()
    return {"status": "SUCCESS"}


@router.post("/get_qpaps")
def get_qpaps(user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """Matches /staff/get_qpaps, returning papers with questions for staff management"""
    qpaps = db.query(models.QuestionPaper).filter(models.QuestionPaper.tenant_id == user.tenant_id).all()
    out = []
    for q in qpaps:
        q_list = []
        for qst in q.questions:
            try:
                opts = json.loads(qst.options_json)
            except Exception:
                opts = []
            try:
                k = json.loads(qst.key_json)
            except Exception:
                k = [qst.key_json]
            q_list.append({
                "id": qst.id,
                "qno": qst.qno,
                "qtxt": qst.qtxt,
                "type": qst.type,
                "subj": qst.subj,
                "cmk": qst.cmk,
                "imk": qst.imk,
                "options": opts,
                "key": k[0] if k else ""
            })

        out.append({
            "Id": q.id,
            "Name": q.name,
            "Subjects": q.subjects,
            "Type": q.exam_type,
            "mins": q.duration_mins,
            "status": q.status,
            "crby": q.created_by,
            "Date": str(q.created_at)[:10],
            "questions": q_list
        })
    return {"qpaps": out, "status": "SUCCESS"}


@router.post("/add_qpap")
async def add_qpap(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    data = {}
    if "application/json" in request.headers.get("content-type", ""):
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    name = data.get("name", "New Question Paper")
    subjects = data.get("subjects", "Maths, Physics, Chemistry")
    exam_type = data.get("type", "JEE-Main")
    mins = int(data.get("mins", 180) or 180)

    qpap = models.QuestionPaper(
        tenant_id=user.tenant_id,
        name=name,
        subjects=subjects,
        exam_type=exam_type,
        duration_mins=mins,
        status="ACTIVE",
        created_by=user.username
    )
    db.add(qpap)
    db.commit()
    db.refresh(qpap)

    return {"status": "SUCCESS", "qpap_id": qpap.id}


@router.post("/add_qstn")
async def add_qstn(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    data = {}
    if "application/json" in request.headers.get("content-type", ""):
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    qpap_id = int(data.get("qpap_id") or data.get("id", 1))
    qtxt = data.get("qtxt") or data.get("qtxtbox", "Question statement")
    qtype = data.get("type") or data.get("qtype", "SINGLE_CORRECT")
    key = data.get("key", "A")
    if isinstance(key, str):
        key = [k.strip() for k in key.split(",") if k.strip()]
    elif not isinstance(key, list):
        key = [str(key)]

    cmk = float(data.get("cmk", 4.0) or 4.0)
    imk = float(data.get("imk", -1.0) or -1.0)
    subj = data.get("subj", "Maths")
    diff = data.get("diff", "MEDIUM")

    question = models.Question(
        qpap_id=qpap_id,
        qno=int(data.get("qno", 1) or 1),
        type=qtype,
        qtxt=qtxt,
        key_json=json.dumps(key),
        options_json=json.dumps(data.get("options", ["A", "B", "C", "D"])),
        cmk=cmk,
        imk=imk,
        subj=subj,
        diff=diff
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return {"status": "SUCCESS", "question_id": question.id}


@router.post("/get_studs_paging")
def get_studs_paging(user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    studs = db.query(models.User).filter(
        models.User.tenant_id == user.tenant_id,
        models.User.role == "student"
    ).all()
    
    data = []
    for s in studs:
        data.append({
            "id": s.id,
            "name": s.username,
            "rollnum": s.rollnum,
            "email": s.email,
            "phone": s.phone,
            "branch": s.branch,
            "centre": s.centre,
            "class": s.class_name,
            "is_active": s.is_active
        })
    return {"data": data, "itemsCount": len(data)}


@router.post("/add_stud")
async def add_stud(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    data = {}
    if "application/json" in request.headers.get("content-type", ""):
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    name = data.get("name", "Student")
    email = data.get("email", f"student_{datetime.datetime.utcnow().timestamp()}@local")
    phone = data.get("phone", "")
    rollnum = data.get("rollnum", f"ROLL-{datetime.datetime.utcnow().strftime('%H%M%S')}")
    password = data.get("pass", "password123")

    new_stud = models.User(
        tenant_id=user.tenant_id,
        username=name,
        email=email,
        phone=phone,
        rollnum=rollnum,
        role="student",
        password_hash=auth.hash_password(password),
        branch=data.get("branch", "General"),
        centre=data.get("centre", "Main"),
        class_name=data.get("class", "Class 12")
    )
    db.add(new_stud)
    db.commit()
    return {"status": "SUCCESS"}


@router.post("/get_res")
async def get_results(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    form = await request.form()
    exam_id = form.get("onex_id") or form.get("id")
    query = db.query(models.ExamAttempt).join(models.ExamSchedule).filter(
        models.ExamSchedule.tenant_id == user.tenant_id,
        models.ExamAttempt.status == "SUBMITTED"
    )
    if exam_id:
        query = query.filter(models.ExamAttempt.exam_id == int(exam_id))

    attempts = query.all()
    results = []
    for att in attempts:
        results.append({
            "id": att.id,
            "student_name": att.user.username,
            "rollnum": att.user.rollnum,
            "exam_name": att.exam.name,
            "score": att.score,
            "total_marks": att.total_marks,
            "switch_count": att.switch_count,
            "submitted_at": str(att.end_time)[:19] if att.end_time else ""
        })
    return {"results": results, "status": "SUCCESS"}


@router.post("/get_subm")
async def get_submissions(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """FEAT-05A: Retrieve candidate submission attempts for an exam"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    exam_id = body.get("onexid") or body.get("onex_id") or body.get("id")
    if not exam_id:
        raise HTTPException(status_code=400, detail="Missing onexid")

    exam = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.id == int(exam_id),
        models.ExamSchedule.tenant_id == user.tenant_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    attempts = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.exam_id == exam.id,
        models.ExamAttempt.status == "SUBMITTED"
    ).all()

    subm_list = []
    for att in attempts:
        subm_list.append({
            "id": att.id,
            "rollnum": att.user.rollnum,
            "stud__rollnum": att.user.rollnum,
            "name": att.user.username,
            "score": att.score,
            "total_marks": att.total_marks,
            "switch_count": att.switch_count,
            "time": str(att.end_time)[:19] if att.end_time else str(att.start_time)[:19]
        })

    return {
        "status": "SUCCESS",
        "num_subm": len(subm_list),
        "subm": subm_list
    }


@router.post("/get_absentees")
async def get_absentees(request: Request, user: models.User = Depends(get_staff_user), db: Session = Depends(get_db)):
    """FEAT-05A: Compute and export absentee roster as RFC 4180 CSV"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    exam_id = body.get("onexid") or body.get("onex_id") or body.get("id")
    if not exam_id:
        raise HTTPException(status_code=400, detail="Missing onexid")

    exam = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.id == int(exam_id),
        models.ExamSchedule.tenant_id == user.tenant_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    stud_query = db.query(models.User).filter(
        models.User.tenant_id == user.tenant_id,
        models.User.role == "student"
    )
    if exam.branches and exam.branches != "All":
        stud_query = stud_query.filter(models.User.branch == exam.branches)
    if exam.centres and exam.centres != "All":
        stud_query = stud_query.filter(models.User.centre == exam.centres)
    enrolled_students = stud_query.all()

    submitted_user_ids = {
        att[0] for att in db.query(models.ExamAttempt.user_id).filter(
            models.ExamAttempt.exam_id == exam.id,
            models.ExamAttempt.status == "SUBMITTED"
        ).all()
    }

    absentees = [s for s in enrolled_students if s.id not in submitted_user_ids]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Roll Number", "Email", "Phone", "Branch", "Centre"])
    for s in absentees:
        writer.writerow([s.username, s.rollnum, s.email, s.phone or "", s.branch or "", s.centre or ""])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="absentees_exam_{exam.id}.csv"'}
    )


# --- Phase J Vertical Slice Features ---

@router.post("/add_studs_csv")
async def add_students_csv(
    file: UploadFile = File(...),
    overwrite: str = Form("false"),
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-001: Bulk student CSV ingestion with column normalization and overwrite support"""
    contents = await file.read()
    try:
        text = contents.decode("utf-8-sig")
    except Exception:
        text = contents.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="Empty or invalid CSV file")

    field_map = {f.strip().lower().replace(" ", "").replace("_", ""): f for f in reader.fieldnames}

    name_col = next((field_map[k] for k in ["name", "fullname", "studentname"] if k in field_map), None)
    email_col = next((field_map[k] for k in ["email", "emailaddress"] if k in field_map), None)
    roll_col = next((field_map[k] for k in ["rollnum", "rollno", "rollnumber", "id"] if k in field_map), None)
    branch_col = next((field_map[k] for k in ["branch", "class", "batch"] if k in field_map), None)
    centre_col = next((field_map[k] for k in ["centre", "center", "campus"] if k in field_map), None)
    phone_col = next((field_map[k] for k in ["phone", "phonenumber", "mobile"] if k in field_map), None)

    if not name_col or not email_col:
        raise HTTPException(status_code=400, detail="CSV must include at least 'Name' and 'Email' columns")

    is_overwrite = str(overwrite).strip().lower() in ["true", "1", "yes"]
    imported_count = 0
    updated_count = 0
    default_pw_hash = auth.hash_password("password123")

    for row in reader:
        name = row.get(name_col, "").strip()
        email = row.get(email_col, "").strip().lower()
        if not name or not email:
            continue

        rollnum = row.get(roll_col, "").strip() if roll_col else f"STU-{email.split('@')[0]}"
        branch = row.get(branch_col, "").strip() if branch_col else "JEE-Main"
        centre = row.get(centre_col, "").strip() if centre_col else "Main Campus"
        phone = row.get(phone_col, "").strip() if phone_col else ""

        existing = db.query(models.User).filter(
            models.User.tenant_id == user.tenant_id,
            (models.User.email == email) | (models.User.rollnum == rollnum)
        ).first()

        if existing:
            if is_overwrite:
                existing.username = name
                existing.branch = branch
                existing.centre = centre
                if phone:
                    existing.phone = phone
                updated_count += 1
        else:
            new_stud = models.User(
                tenant_id=user.tenant_id,
                username=name,
                email=email,
                phone=phone,
                rollnum=rollnum,
                branch=branch,
                centre=centre,
                password_hash=default_pw_hash,
                role="student"
            )
            db.add(new_stud)
            imported_count += 1

    db.commit()
    return {
        "status": "SUCCESS",
        "imported_count": imported_count,
        "updated_count": updated_count,
        "msg": f"Successfully processed {imported_count + updated_count} students ({imported_count} new, {updated_count} updated)."
    }


@router.get("/download_studs")
def download_students_csv(
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-001: Export complete student roster as RFC 4180 CSV"""
    studs = db.query(models.User).filter(
        models.User.tenant_id == user.tenant_id,
        models.User.role == "student"
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Roll Number", "Email", "Phone", "Branch", "Centre"])
    for s in studs:
        writer.writerow([s.username, s.rollnum, s.email, s.phone, s.branch, s.centre])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="student_roster.csv"'}
    )


@router.get("/academic_structure")
def get_academic_structure(
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-002: Retrieves centres, batches, and subjects for the tenant"""
    centres = db.query(models.Centre).filter(models.Centre.tenant_id == user.tenant_id).all()
    branches = db.query(models.Branch).filter(models.Branch.tenant_id == user.tenant_id).all()
    subjects = db.query(models.Subject).filter(models.Subject.tenant_id == user.tenant_id).all()

    return {
        "status": "SUCCESS",
        "centres": [{"id": c.id, "name": c.name, "code": c.code, "address": c.address} for c in centres],
        "branches": [{"id": b.id, "name": b.name, "code": b.code} for b in branches],
        "subjects": [{"id": s.id, "name": s.name, "code": s.code} for s in subjects]
    }


@router.post("/add_edit_centre")
async def add_edit_centre(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-002: Add or delete campus centre"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    old_name = body.get("old_centre") or body.get("old_name", "")
    new_name = body.get("new_centre") or body.get("name", "")
    is_delete = str(body.get("delete_centre") or body.get("delete", "")).lower() == "true"

    if is_delete and old_name:
        centre = db.query(models.Centre).filter(models.Centre.tenant_id == user.tenant_id, models.Centre.name == old_name).first()
        if centre:
            db.delete(centre)
            db.commit()
            return {"status": "SUCCESS", "msg": f"Centre '{old_name}' deleted."}
    elif new_name:
        existing = db.query(models.Centre).filter(models.Centre.tenant_id == user.tenant_id, models.Centre.name == new_name).first()
        if not existing:
            c = models.Centre(tenant_id=user.tenant_id, name=new_name, code=new_name[:3].upper())
            db.add(c)
            db.commit()
            return {"status": "SUCCESS", "msg": f"Centre '{new_name}' added."}
    return {"status": "SUCCESS", "msg": "Action completed."}


@router.post("/add_edit_class")
async def add_edit_class(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-002: Add or delete class/branch cohort"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    old_name = body.get("old_class") or body.get("old_name", "")
    new_name = body.get("new_class") or body.get("name", "")
    is_delete = str(body.get("delete_class") or body.get("delete", "")).lower() == "true"

    if is_delete and old_name:
        branch = db.query(models.Branch).filter(models.Branch.tenant_id == user.tenant_id, models.Branch.name == old_name).first()
        if branch:
            db.delete(branch)
            db.commit()
            return {"status": "SUCCESS", "msg": f"Batch '{old_name}' deleted."}
    elif new_name:
        existing = db.query(models.Branch).filter(models.Branch.tenant_id == user.tenant_id, models.Branch.name == new_name).first()
        if not existing:
            b = models.Branch(tenant_id=user.tenant_id, name=new_name, code=new_name[:3].upper())
            db.add(b)
            db.commit()
            return {"status": "SUCCESS", "msg": f"Batch '{new_name}' added."}
    return {"status": "SUCCESS", "msg": "Action completed."}


@router.post("/add_edit_subj")
async def add_edit_subj(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-002: Add or delete subject"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    old_name = body.get("old_subj_name") or body.get("old_name", "")
    new_name = body.get("new_subj_name") or body.get("name", "")
    is_delete = str(body.get("delete_subj") or body.get("delete", "")).lower() == "true"

    if is_delete and old_name:
        subj = db.query(models.Subject).filter(models.Subject.tenant_id == user.tenant_id, models.Subject.name == old_name).first()
        if subj:
            db.delete(subj)
            db.commit()
            return {"status": "SUCCESS", "msg": f"Subject '{old_name}' deleted."}
    elif new_name:
        existing = db.query(models.Subject).filter(models.Subject.tenant_id == user.tenant_id, models.Subject.name == new_name).first()
        if not existing:
            s = models.Subject(tenant_id=user.tenant_id, name=new_name, code=new_name[:4].upper())
            db.add(s)
            db.commit()
            return {"status": "SUCCESS", "msg": f"Subject '{new_name}' added."}
    return {"status": "SUCCESS", "msg": "Action completed."}


@router.post("/update_qstn")
async def update_question(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-003: In-place question editing"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    qid = int(body.get("qid"))
    q = db.query(models.Question).join(models.QuestionPaper).filter(
        models.Question.id == qid,
        models.QuestionPaper.tenant_id == user.tenant_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if "qtxt" in body and body["qtxt"]: q.qtxt = body["qtxt"]
    if "type" in body and body["type"]: q.type = body["type"]
    if "subj" in body and body["subj"]: q.subj = body["subj"]
    if "cmk" in body: q.cmk = float(body["cmk"])
    if "imk" in body: q.imk = float(body["imk"])
    if "options" in body:
        opts = body["options"]
        if isinstance(opts, str):
            opts = [x.strip() for x in opts.split(",") if x.strip()]
        q.options_json = json.dumps(opts)
    if "key" in body:
        k = body["key"]
        q.key_json = json.dumps(k if isinstance(k, list) else [k])

    db.commit()
    return {"status": "SUCCESS", "msg": "Question updated successfully"}


@router.post("/del_qstn")
async def delete_question(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-003: Delete question from question paper"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    qid = int(body.get("qid") or body.get("qnum", 0))
    q = db.query(models.Question).join(models.QuestionPaper).filter(
        models.Question.id == qid,
        models.QuestionPaper.tenant_id == user.tenant_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(q)
    db.commit()
    return {"status": "SUCCESS", "msg": "Question deleted successfully"}


@router.post("/del_qpap")
async def delete_question_paper(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-003: Delete unused question paper"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    qpap_id = int(body.get("qpap_id"))
    qpap = db.query(models.QuestionPaper).filter(
        models.QuestionPaper.id == qpap_id,
        models.QuestionPaper.tenant_id == user.tenant_id
    ).first()
    if not qpap:
        raise HTTPException(status_code=404, detail="Question paper not found")

    active_exam = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.qpap_id == qpap_id,
        models.ExamSchedule.status.in_(["RUNNING", "SCHEDULED"])
    ).first()
    if active_exam:
        return {"status": "FAILED", "error": f"Cannot delete paper referenced by active exam '{active_exam.name}'"}

    db.delete(qpap)
    db.commit()
    return {"status": "SUCCESS", "msg": "Question paper deleted successfully"}


@router.get("/get_notices")
def get_notices(
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-08A: Retrieve active notices"""
    notices = db.query(models.Notice).filter(
        models.Notice.tenant_id == user.tenant_id
    ).order_by(models.Notice.id.desc()).all()
    return {
        "status": "SUCCESS",
        "notices": [
            {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "target_branch": n.target_branch,
                "target_centre": n.target_centre,
                "created_by": n.created_by,
                "created_at": str(n.created_at)[:16]
            }
            for n in notices
        ]
    }


@router.post("/add_notice")
async def add_notice(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-08A: Broadcast notice to batches"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    title = body.get("title", "").strip()
    content = body.get("content", "").strip()
    target_branch = body.get("target_branch", "All").strip()
    target_centre = body.get("target_centre", "All").strip()

    if not title or not content:
        raise HTTPException(status_code=400, detail="Title and content are required")

    notice = models.Notice(
        tenant_id=user.tenant_id,
        title=title,
        content=content,
        target_branch=target_branch,
        target_centre=target_centre,
        created_by=user.username
    )
    db.add(notice)
    db.commit()
    return {"status": "SUCCESS", "msg": "Notice published successfully"}


@router.post("/del_notice")
async def delete_notice(
    request: Request,
    user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db)
):
    """FEAT-08A: Delete broadcast notice"""
    body = await request.json() if "application/json" in request.headers.get("content-type", "") else await request.form()
    nid = int(body.get("notice_id"))
    n = db.query(models.Notice).filter(
        models.Notice.id == nid,
        models.Notice.tenant_id == user.tenant_id
    ).first()
    if n:
        db.delete(n)
        db.commit()
    return {"status": "SUCCESS", "msg": "Notice deleted"}

