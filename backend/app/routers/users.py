from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.models import User
from app.schemas import TechnicianOut, UserCreate, UserOut, UserUpdate
from app.services import require_roles

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    user = User(email=payload.email, password_hash=hash_password(payload.password), full_name=payload.full_name, role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/technicians", response_model=list[TechnicianOut])
def list_technicians(db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "manager"))):
    return db.query(User).filter(User.role == "technician", User.is_active.is_(True)).order_by(User.id).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    changes = payload.model_dump(exclude_unset=True)
    if "email" in changes and changes["email"] != user.email and db.query(User).filter(User.email == changes["email"]).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    password = changes.pop("password", None)
    if password is not None:
        user.password_hash = hash_password(password)
    for field, value in changes.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
