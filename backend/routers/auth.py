from fastapi import APIRouter, Depends, HTTPException, Request, Response, Form
from sqlalchemy.orm import Session
from database import get_db
import models
import auth

router = APIRouter(tags=["Authentication"])

@router.post("/login")
async def login(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    # Handle either JSON body or x-www-form-urlencoded / FormData
    content_type = request.headers.get("content-type", "")
    sdom = ""
    username = ""
    password = ""
    next_path = ""

    if "application/json" in content_type:
        try:
            body = await request.json()
            sdom = body.get("sdom", "").strip()
            username = body.get("username", "").strip()
            password = body.get("password", "").strip()
            next_path = body.get("next", "").strip()
        except Exception:
            pass
    else:
        form = await request.form()
        sdom = form.get("sdom", "").strip()
        username = form.get("username", "").strip()
        password = form.get("password", "").strip()
        next_path = form.get("next", "").strip()

    # Fallback to tenant 'ezexamqwertyuiop' if none specified
    if not sdom:
        sdom = "ezexamqwertyuiop"

    tenant = db.query(models.Tenant).filter(models.Tenant.sdom == sdom).first()
    if not tenant:
        # Auto-create demo tenant if missing
        tenant = models.Tenant(sdom=sdom, name=sdom.capitalize(), title="Online Exam Portal")
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    # Search user by username or email or phone
    user = db.query(models.User).filter(
        models.User.tenant_id == tenant.id,
        (models.User.username == username) | (models.User.email == username) | (models.User.rollnum == username)
    ).first()

    if not user:
        # Check if this is the default initial admin
        if (username in ["ezexamqwertyuiop", "ezexam@yopmail.com"]) and password == "qwertyuiop":
            user = models.User(
                tenant_id=tenant.id,
                username="ezexamqwertyuiop",
                email="ezexam@yopmail.com",
                password_hash=auth.hash_password("qwertyuiop"),
                role="admin"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            return {"login_status": "FAILED", "error": "Invalid username or password.", "redirect": ""}

    if not auth.verify_password(password, user.password_hash):
        return {"login_status": "FAILED", "error": "Invalid username or password.", "redirect": ""}

    # Create session token
    token = auth.create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "tenant_id": tenant.id,
        "sdom": tenant.sdom
    })

    redirect_dest = next_path if next_path else ("staff" if user.role in ["admin", "faculty", "chead"] else "exam/list")

    response.set_cookie(key="sessionid", value=token, httponly=True, path="/")
    response.set_cookie(key="access_token", value=token, httponly=False, path="/")

    return {
        "login_status": "OK",
        "error": "",
        "redirect": redirect_dest,
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "sdom": tenant.sdom
        }
    }

@router.get("/api/auth/me")
def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.cookies.get("sessionid") or request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "rollnum": user.rollnum,
        "branch": user.branch,
        "centre": user.centre,
        "tenant": {
            "id": user.tenant.id,
            "sdom": user.tenant.sdom,
            "name": user.tenant.name
        }
    }
