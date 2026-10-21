import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    sdom = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    title = Column(String(100), default="Online Exam System")
    logo_url = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="tenant")
    qpaps = relationship("QuestionPaper", back_populates="tenant")
    exams = relationship("ExamSchedule", back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    username = Column(String(80), index=True, nullable=False)
    email = Column(String(120), index=True, nullable=False)
    phone = Column(String(20), default="")
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="student")  # admin, faculty, chead, student
    rollnum = Column(String(50), default="")
    branch = Column(String(50), default="General")
    centre = Column(String(50), default="Main")
    class_name = Column(String(50), default="Class 12")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")
    attempts = relationship("ExamAttempt", back_populates="user")


class QuestionPaper(Base):
    __tablename__ = "question_papers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(150), nullable=False)
    subjects = Column(String(200), default="Maths, Physics, Chemistry")
    exam_type = Column(String(50), default="JEE-Main")
    duration_mins = Column(Integer, default=180)
    status = Column(String(20), default="ACTIVE")
    created_by = Column(String(100), default="admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tenant = relationship("Tenant", back_populates="qpaps")
    questions = relationship("Question", back_populates="qpap", cascade="all, delete-orphan")
    exams = relationship("ExamSchedule", back_populates="qpap")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    qpap_id = Column(Integer, ForeignKey("question_papers.id"), nullable=False)
    qno = Column(Integer, default=1)
    type = Column(String(30), default="SINGLE_CORRECT")  # SINGLE_CORRECT, MULTI_CORRECT, NUMERICAL, INTEGER, TRUE_FALSE, CODING
    qtxt = Column(Text, nullable=False)
    qimg = Column(String(255), default="")
    options_json = Column(Text, default="[]")  # JSON array of options e.g. ["A","B","C","D"] or [{ "key": "A", "val": "..." }]
    key_json = Column(Text, default="[]")      # JSON array of correct keys e.g. ["A"] or ["2.5"]
    cmk = Column(Float, default=4.0)           # Correct marks
    imk = Column(Float, default=-1.0)          # Negative marks
    pmk = Column(Float, default=0.0)           # Partial marks
    diff = Column(String(20), default="MEDIUM") # EASY, MEDIUM, HARD
    subj = Column(String(50), default="Maths")
    topic = Column(String(100), default="")
    test_cases_json = Column(Text, default="[]") # For coding questions: [{ "input": "...", "output": "...", "visible": true, "marks": 5 }]

    qpap = relationship("QuestionPaper", back_populates="questions")


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    qpap_id = Column(Integer, ForeignKey("question_papers.id"), nullable=False)
    name = Column(String(150), nullable=False)
    stime = Column(String(50), nullable=False) # e.g. "2026-10-21 09:00"
    etime = Column(String(50), nullable=False) # e.g. "2026-10-21 21:00"
    mins = Column(Integer, default=180)
    status = Column(String(20), default="SCHEDULED") # SCHEDULED, RUNNING, COMPLETED
    shuf = Column(Boolean, default=True)
    cam = Column(Boolean, default=False)
    pc_only = Column(Boolean, default=False)
    switches = Column(Boolean, default=True)
    num_switches = Column(Integer, default=3)
    hide_qs = Column(Boolean, default=False)
    hide_res = Column(Boolean, default=False)
    hide_anal = Column(Boolean, default=False)
    hide_rank = Column(Boolean, default=False)
    prac = Column(Boolean, default=False)
    sec_skip = Column(Boolean, default=True)
    branches = Column(String(200), default="All")
    centres = Column(String(200), default="All")
    surl = Column(String(50), default="")
    created_by = Column(String(100), default="admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tenant = relationship("Tenant", back_populates="exams")
    qpap = relationship("QuestionPaper", back_populates="exams")
    attempts = relationship("ExamAttempt", back_populates="exam")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exam_schedules.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(20), default="IN_PROGRESS") # IN_PROGRESS, SUBMITTED, TERMINATED
    score = Column(Float, default=0.0)
    total_marks = Column(Float, default=0.0)
    switch_count = Column(Integer, default=0)
    responses_json = Column(Text, default="{}") # { "q_id": { "ans": ["A"], "status": "ANSWERED", "time_spent": 45 } }
    proctor_events_json = Column(Text, default="[]")

    exam = relationship("ExamSchedule", back_populates="attempts")
    user = relationship("User", back_populates="attempts")


class Centre(Base):
    __tablename__ = "centres"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(50), default="")
    address = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    target_branch = Column(String(100), default="All")
    target_centre = Column(String(100), default="All")
    created_by = Column(String(100), default="Staff")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

