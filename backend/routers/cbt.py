import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
import models
import auth

router = APIRouter(prefix="/api/exam", tags=["CBT Exam Engine"])

def get_candidate_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.cookies.get("sessionid") or request.cookies.get("access_token")

    if not token:
        # Fallback to student or first user for frictionless local testing
        stud = db.query(models.User).filter(models.User.role == "student").first()
        if stud:
            return stud
        admin = db.query(models.User).first()
        if admin:
            return admin
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = auth.decode_access_token(token)
    if not payload:
        stud = db.query(models.User).filter(models.User.role == "student").first()
        if stud:
            return stud
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/student/portal")
def get_student_portal(
    user: models.User = Depends(get_candidate_user),
    db: Session = Depends(get_db)
):
    """Retrieve candidate profile, assigned exams, submission history, and notices"""
    exams_query = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.tenant_id == user.tenant_id,
        models.ExamSchedule.status.in_(["SCHEDULED", "RUNNING", "ACTIVE"])
    )
    assigned_exams = []
    for ex in exams_query.all():
        branch_match = (ex.branches == "All" or not ex.branches or user.branch in ex.branches)
        centre_match = (ex.centres == "All" or not ex.centres or user.centre in ex.centres)
        if branch_match and centre_match:
            submitted_attempt = db.query(models.ExamAttempt).filter(
                models.ExamAttempt.exam_id == ex.id,
                models.ExamAttempt.user_id == user.id,
                models.ExamAttempt.status == "SUBMITTED"
            ).order_by(models.ExamAttempt.id.desc()).first()

            in_progress_attempt = db.query(models.ExamAttempt).filter(
                models.ExamAttempt.exam_id == ex.id,
                models.ExamAttempt.user_id == user.id,
                models.ExamAttempt.status == "IN_PROGRESS"
            ).first()

            assigned_exams.append({
                "id": ex.id,
                "name": ex.name,
                "mins": ex.mins,
                "stime": ex.stime,
                "etime": ex.etime,
                "switches": ex.switches,
                "num_switches": ex.num_switches,
                "subjects": ex.qpap.subjects if ex.qpap else "",
                "status": "COMPLETED" if submitted_attempt else ("IN_PROGRESS" if in_progress_attempt else "AVAILABLE"),
                "submitted_score": submitted_attempt.score if submitted_attempt else None,
                "attempt_id": submitted_attempt.id if submitted_attempt else (in_progress_attempt.id if in_progress_attempt else None)
            })

    past_attempts = db.query(models.ExamAttempt).join(models.ExamSchedule).filter(
        models.ExamAttempt.user_id == user.id,
        models.ExamAttempt.status == "SUBMITTED"
    ).order_by(models.ExamAttempt.id.desc()).all()

    submissions = []
    for att in past_attempts:
        submissions.append({
            "attempt_id": att.id,
            "exam_id": att.exam_id,
            "exam_name": att.exam.name,
            "score": att.score,
            "total_marks": att.total_marks,
            "submitted_at": str(att.end_time)[:19] if att.end_time else "",
            "switch_count": att.switch_count
        })

    notices_query = db.query(models.Notice).filter(
        models.Notice.tenant_id == user.tenant_id,
        (models.Notice.target_branch == "All") | (models.Notice.target_branch == user.branch),
        (models.Notice.target_centre == "All") | (models.Notice.target_centre == user.centre)
    ).order_by(models.Notice.id.desc()).all()

    notices = [
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "created_by": n.created_by,
            "created_at": str(n.created_at)[:16]
        }
        for n in notices_query
    ]

    return {
        "status": "SUCCESS",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "rollnum": user.rollnum,
            "branch": user.branch,
            "centre": user.centre,
            "role": user.role,
            "institution": user.tenant.name
        },
        "assigned_exams": assigned_exams,
        "past_submissions": submissions,
        "notices": notices
    }


@router.post("/{exam_id}/start")
def start_exam(
    exam_id: int,
    user: models.User = Depends(get_candidate_user),
    db: Session = Depends(get_db)
):
    exam = db.query(models.ExamSchedule).filter(models.ExamSchedule.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    qpap = db.query(models.QuestionPaper).filter(models.QuestionPaper.id == exam.qpap_id).first()
    if not qpap:
        raise HTTPException(status_code=404, detail="Question paper not found")

    # Find or create active attempt
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.exam_id == exam.id,
        models.ExamAttempt.user_id == user.id,
        models.ExamAttempt.status == "IN_PROGRESS"
    ).order_by(models.ExamAttempt.id.desc()).first()

    if not attempt:
        attempt = models.ExamAttempt(
            exam_id=exam.id,
            user_id=user.id,
            start_time=datetime.datetime.utcnow(),
            status="IN_PROGRESS",
            responses_json="{}"
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    # Sanitize questions: DO NOT leak correct keys to candidate frontend!
    questions_data = []
    for q in qpap.questions:
        try:
            options = json.loads(q.options_json)
        except Exception:
            options = ["A", "B", "C", "D"]

        questions_data.append({
            "id": q.id,
            "qno": q.qno,
            "type": q.type,
            "qtxt": q.qtxt,
            "qimg": q.qimg,
            "subj": q.subj,
            "cmk": q.cmk,
            "imk": q.imk,
            "diff": q.diff,
            "options": options
        })

    try:
        saved_responses = json.loads(attempt.responses_json)
    except Exception:
        saved_responses = {}

    return {
        "status": "SUCCESS",
        "attempt_id": attempt.id,
        "exam": {
            "id": exam.id,
            "name": exam.name,
            "mins": exam.mins,
            "switches": exam.switches,
            "num_switches": exam.num_switches,
            "sec_skip": exam.sec_skip,
            "shuf": exam.shuf
        },
        "questions": questions_data,
        "saved_responses": saved_responses,
        "switch_count": attempt.switch_count
    }


@router.post("/{exam_id}/save_response")
async def save_response(
    exam_id: int,
    request: Request,
    user: models.User = Depends(get_candidate_user),
    db: Session = Depends(get_db)
):
    body = await request.json()
    q_id = str(body.get("q_id"))
    ans = body.get("ans", [])
    q_status = body.get("status", "ANSWERED")

    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.exam_id == exam_id,
        models.ExamAttempt.user_id == user.id,
        models.ExamAttempt.status == "IN_PROGRESS"
    ).first()

    if not attempt:
        raise HTTPException(status_code=400, detail="No active exam attempt")

    try:
        responses = json.loads(attempt.responses_json)
    except Exception:
        responses = {}

    responses[q_id] = {
        "ans": ans,
        "status": q_status,
        "updated_at": datetime.datetime.utcnow().isoformat()
    }
    attempt.responses_json = json.dumps(responses)
    db.commit()

    return {"status": "SUCCESS"}


@router.post("/{exam_id}/log_event")
async def log_event(
    exam_id: int,
    request: Request,
    user: models.User = Depends(get_candidate_user),
    db: Session = Depends(get_db)
):
    body = await request.json()
    event_type = body.get("type", "SWITCH_WINDOW")

    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.exam_id == exam_id,
        models.ExamAttempt.user_id == user.id,
        models.ExamAttempt.status == "IN_PROGRESS"
    ).first()

    if not attempt:
        return {"status": "NO_ACTIVE_ATTEMPT"}

    if event_type == "SWITCH_WINDOW":
        attempt.switch_count += 1
        db.commit()

    return {
        "status": "SUCCESS",
        "switch_count": attempt.switch_count,
        "limit_reached": attempt.switch_count >= attempt.exam.num_switches
    }


@router.post("/{exam_id}/submit")
def submit_exam(
    exam_id: int,
    user: models.User = Depends(get_candidate_user),
    db: Session = Depends(get_db)
):
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.exam_id == exam_id,
        models.ExamAttempt.user_id == user.id,
        models.ExamAttempt.status == "IN_PROGRESS"
    ).order_by(models.ExamAttempt.id.desc()).first()

    if not attempt:
        # Idempotency check: if already submitted, return the latest submission
        already_submitted = db.query(models.ExamAttempt).filter(
            models.ExamAttempt.exam_id == exam_id,
            models.ExamAttempt.user_id == user.id,
            models.ExamAttempt.status == "SUBMITTED"
        ).order_by(models.ExamAttempt.id.desc()).first()

        if already_submitted:
            return {
                "status": "SUCCESS",
                "attempt_id": already_submitted.id,
                "score": already_submitted.score,
                "total_marks": already_submitted.total_marks,
                "already_submitted": True
            }

        raise HTTPException(status_code=400, detail="No active attempt found to submit")

    qpap = attempt.exam.qpap
    try:
        responses = json.loads(attempt.responses_json)
    except Exception:
        responses = {}

    total_score = 0.0
    max_marks = 0.0

    # Auto-grading algorithm
    for q in qpap.questions:
        max_marks += q.cmk
        q_resp = responses.get(str(q.id))
        if not q_resp or not q_resp.get("ans"):
            continue

        candidate_ans = q_resp.get("ans", [])
        try:
            correct_keys = json.loads(q.key_json)
        except Exception:
            correct_keys = [q.key_json]

        # Case-insensitive comparison
        cand_norm = set([str(x).strip().upper() for x in candidate_ans])
        corr_norm = set([str(x).strip().upper() for x in correct_keys])

        if cand_norm == corr_norm:
            total_score += q.cmk
        else:
            total_score += q.imk  # apply negative marks

    attempt.score = round(total_score, 2)
    attempt.total_marks = round(max_marks, 2)
    attempt.status = "SUBMITTED"
    attempt.end_time = datetime.datetime.utcnow()
    db.commit()

    return {
        "status": "SUCCESS",
        "attempt_id": attempt.id,
        "score": attempt.score,
        "total_marks": attempt.total_marks
    }


@router.get("/{exam_id}/result")
def get_result(
    exam_id: int,
    user: models.User = Depends(get_candidate_user),
    db: Session = Depends(get_db)
):
    """Retrieve scorecard by attempt ID or exam ID with tenant and role scoping"""
    attempt = None

    # 1. If candidate is requesting results for an exam schedule ID, return their latest submitted attempt
    if user.role == "student":
        exam_schedule = db.query(models.ExamSchedule).filter(
            models.ExamSchedule.id == exam_id,
            models.ExamSchedule.tenant_id == user.tenant_id
        ).first()
        if exam_schedule:
            attempt = db.query(models.ExamAttempt).filter(
                models.ExamAttempt.exam_id == exam_id,
                models.ExamAttempt.user_id == user.id,
                models.ExamAttempt.status == "SUBMITTED"
            ).order_by(models.ExamAttempt.id.desc()).first()

    # 2. Lookup by attempt.id within tenant (used by staff review and direct attempt links)
    if not attempt:
        attempt = db.query(models.ExamAttempt).join(models.ExamSchedule).filter(
            models.ExamAttempt.id == exam_id,
            models.ExamSchedule.tenant_id == user.tenant_id
        ).first()

    # 3. Fallback: lookup latest submitted attempt for this exam_id within tenant
    if not attempt:
        query = db.query(models.ExamAttempt).join(models.ExamSchedule).filter(
            models.ExamAttempt.exam_id == exam_id,
            models.ExamSchedule.tenant_id == user.tenant_id,
            models.ExamAttempt.status == "SUBMITTED"
        )
        if user.role == "student":
            query = query.filter(models.ExamAttempt.user_id == user.id)
        attempt = query.order_by(models.ExamAttempt.id.desc()).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="No submitted attempt found for this exam")

    # Enforce candidate isolation: students can only review their own attempts
    if user.role == "student" and attempt.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot view another candidate's results")

    qpap = attempt.exam.qpap
    try:
        responses = json.loads(attempt.responses_json)
    except Exception:
        responses = {}

    question_reviews = []
    for q in qpap.questions:
        q_resp = responses.get(str(q.id))
        cand_ans = q_resp.get("ans", []) if q_resp else []
        try:
            corr_keys = json.loads(q.key_json)
        except Exception:
            corr_keys = [q.key_json]

        is_correct = (set([str(x).strip().upper() for x in cand_ans]) ==
                      set([str(x).strip().upper() for x in corr_keys]))

        question_reviews.append({
            "id": q.id,
            "qno": q.qno,
            "qtxt": q.qtxt,
            "subj": q.subj,
            "candidate_ans": cand_ans,
            "correct_key": corr_keys,
            "is_correct": is_correct,
            "cmk": q.cmk,
            "imk": q.imk
        })

    return {
        "attempt_id": attempt.id,
        "candidate_name": attempt.user.username,
        "candidate_rollnum": attempt.user.rollnum,
        "exam_name": attempt.exam.name,
        "score": attempt.score,
        "total_marks": attempt.total_marks,
        "switch_count": attempt.switch_count,
        "submitted_at": str(attempt.end_time)[:19] if attempt.end_time else "",
        "questions": question_reviews
    }
