from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.schemas import TechnicianOut
from app.services import require_roles

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/technicians", response_model=list[TechnicianOut])
def list_technicians(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "manager")),
):
    return (
        db.query(User)
        .filter(User.role == "technician", User.is_active.is_(True))
        .order_by(User.id)
        .all()
    )
