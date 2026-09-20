from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Ticket, User
from app.services import require_roles

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

OPEN_STATUSES = ("NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER")


@router.get("/stats")
def stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "manager")),
):
    counts = dict(
        db.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
    )
    total = sum(counts.values())
    open_count = sum(counts.get(s, 0) for s in OPEN_STATUSES)
    recent = (
        db.query(Ticket).order_by(Ticket.id.desc()).limit(10).all()
    )
    return {
        "total": total,
        "open": open_count,
        "resolved": counts.get("RESOLVED", 0),
        "closed": counts.get("CLOSED", 0),
        "by_status": counts,
        "recent": [
            {"id": t.id, "title": t.title, "status": t.status, "priority": t.priority}
            for t in recent
        ],
    }
