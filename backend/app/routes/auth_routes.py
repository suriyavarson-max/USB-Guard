from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import UserLogin, TokenResponse, UserOut
from backend.app.security.auth import (
    hash_password,
    verify_password,
    create_access_token,
    check_login_rate_limit,
    get_current_user_token
)
from backend.app.services.audit_service import record_audit_event

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    if not check_login_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 60 seconds."
        )

    user = db.query(User).filter(User.username == creds.username).first()
    
    # Auto-seed default defensive admin if empty (first launch)
    if not user and creds.username == "admin" and db.query(User).count() == 0:
        user = User(
            username="admin",
            hashed_password=hash_password("admin123"), # Default college lab password
            role="admin",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user or not verify_password(creds.password, user.hashed_password):
        record_audit_event(
            db=db,
            platform="system",
            event_type="LOGIN_FAILED",
            actor=creds.username,
            description=f"Failed login attempt for user '{creds.username}' from {client_ip}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user.id, user.username, user.role)
    record_audit_event(
        db=db,
        platform="system",
        event_type="LOGIN",
        actor=user.username,
        description=f"Administrator '{user.username}' successfully authenticated"
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(
            id=user.id,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )
    )

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    record_audit_event(
        db=db,
        platform="system",
        event_type="LOGOUT",
        actor=current_user.get("username", "admin"),
        description=f"Administrator '{current_user.get('username')}' logged out"
    )
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserOut)
def get_current_user(current_user: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(
        id=user.id,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )
