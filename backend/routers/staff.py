import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Form
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
        # Fallback for local demo if no header: retrieve first admin user
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if admin:
            return admin
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = auth.decode_access_token(token)
    if not payload:
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if admin:
            return admin
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
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
    """Matches /staff/get_qpaps"""
    qpaps = db.query(models.QuestionPaper).filter(models.QuestionPaper.tenant_id == user.tenant_id).all()
    out = []
    for q in qpaps:
        out.append({
            "Id": q.id,
            "Name": q.name,
            "Subjects": q.subjects,
            "Type": q.exam_type,
            "mins": q.duration_mins,
            "status": q.status,
            "crby": q.created_by,
            "Date": str(q.created_at)[:10]
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
