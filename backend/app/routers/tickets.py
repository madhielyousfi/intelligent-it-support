from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Article, Category, Customer, Device, Ticket, TicketHistory, User
from app.schemas import (
    AssignIn,
    RecategorizeIn,
    ResolveIn,
    SimilarTicketOut,
    StatusIn,
    SuggestionsOut,
    TicketCreate,
    TicketDetail,
    TicketOut,
)
from app.services import get_current_user, require_roles
from app.services.classifier import predict as ai_predict

router = APIRouter(prefix="/tickets", tags=["tickets"])

# Backend-enforced state machine (Session 3).
# /assign:  NEW -> ASSIGNED, ASSIGNED -> ASSIGNED (reassign)
# /status:  ASSIGNED -> IN_PROGRESS, IN_PROGRESS -> WAITING_CUSTOMER,
#           WAITING_CUSTOMER -> IN_PROGRESS, RESOLVED -> CLOSED
# /resolve: IN_PROGRESS -> RESOLVED, WAITING_CUSTOMER -> RESOLVED
STATUS_VIA_STATUS = {
    "ASSIGNED": {"IN_PROGRESS"},
    "IN_PROGRESS": {"WAITING_CUSTOMER"},
    "WAITING_CUSTOMER": {"IN_PROGRESS"},
    "RESOLVED": {"CLOSED"},
}


def _detail(ticket_id: int, db: Session) -> Ticket:
    ticket = (
        db.query(Ticket)
        .options(selectinload(Ticket.history))
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def _record(db: Session, ticket: Ticket, actor_id: int | None, action: str,
            old: str | None, new: str | None, note: str | None = None) -> None:
    db.add(TicketHistory(ticket_id=ticket.id, actor_id=actor_id, action=action,
                         old_value=old, new_value=new, note=note))


@router.post("", response_model=TicketDetail, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=400, detail="customer_id does not exist")
    if payload.device_id is not None:
        device = db.get(Device, payload.device_id)
        if not device:
            raise HTTPException(status_code=400, detail="device_id does not exist")
        if device.customer_id != payload.customer_id:
            raise HTTPException(status_code=400, detail="device does not belong to this customer")
    if payload.category_id is not None and not db.get(Category, payload.category_id):
        raise HTTPException(status_code=400, detail="category_id does not exist")

    ticket = Ticket(
        customer_id=payload.customer_id,
        device_id=payload.device_id,
        category_id=payload.category_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status="NEW",
        technician_id=None,
        # Session 6: AI suggestion fills the future-facing fields at creation.
        # Human-set category_id is never overwritten; low confidence leaves nulls.
        ai_category=None,
        ai_confidence=None,
    )
    if payload.category_id is None:
        label, conf = ai_predict(payload.title, payload.description)
        ticket.ai_category, ticket.ai_confidence = label, conf
    db.add(ticket)
    db.flush()  # get ticket.id for history row
    _record(db, ticket, user.id, "created", None, "NEW", "Ticket created")
    db.commit()
    return _detail(ticket.id, db)


@router.get("", response_model=list[TicketOut])
def list_tickets(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Ticket)
    if status:
        q = q.filter(Ticket.status == status)
    if user.role == "customer":
        # Customers see only tickets of their linked customer record(s)
        q = q.join(Customer, Customer.id == Ticket.customer_id).filter(Customer.user_id == user.id)
    return q.order_by(Ticket.id.desc()).all()


@router.get("/{ticket_id}", response_model=TicketDetail)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _detail(ticket_id, db)


@router.get("/{ticket_id}/similar", response_model=list[SimilarTicketOut])
def similar_tickets(ticket_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Same-category tickets, newest first (Session 7)."""
    ticket = _detail(ticket_id, db)
    if ticket.category_id is None:
        return []
    rows = (
        db.query(Ticket)
        .filter(Ticket.category_id == ticket.category_id, Ticket.id != ticket.id)
        .order_by(Ticket.id.desc())
        .limit(5)
        .all()
    )
    return [SimilarTicketOut.model_validate(r) for r in rows]


@router.get("/{ticket_id}/suggestions", response_model=SuggestionsOut)
def suggested_solutions(ticket_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Similar tickets + their resolutions + category articles (Session 7)."""
    ticket = _detail(ticket_id, db)
    similar: list[Ticket] = []
    articles: list[Article] = []
    if ticket.category_id is not None:
        similar = (
            db.query(Ticket)
            .filter(Ticket.category_id == ticket.category_id, Ticket.id != ticket.id)
            .order_by(Ticket.id.desc())
            .limit(5)
            .all()
        )
        articles = (
            db.query(Article)
            .filter(Article.category_id == ticket.category_id)
            .order_by(Article.id.desc())
            .limit(5)
            .all()
        )
    resolutions = [t.resolution for t in similar if t.resolution]
    return SuggestionsOut(
        similar=[SimilarTicketOut.model_validate(t) for t in similar],
        resolutions=resolutions,
        articles=articles,
    )


@router.patch("/{ticket_id}/recategorize", response_model=TicketDetail)
def recategorize_ticket(
    ticket_id: int,
    payload: RecategorizeIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    """Manager override for the human category (Session 6)."""
    ticket = _detail(ticket_id, db)
    category = db.get(Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="category_id does not exist")
    old = ticket.category.name if ticket.category else None
    ticket.category_id = category.id
    _record(db, ticket, user.id, "recategorized", old, category.name)
    db.commit()
    return _detail(ticket.id, db)


@router.patch("/{ticket_id}/assign", response_model=TicketDetail)
def assign_ticket(
    ticket_id: int,
    payload: AssignIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    ticket = _detail(ticket_id, db)
    if ticket.status not in ("NEW", "ASSIGNED"):
        raise HTTPException(status_code=400, detail=f"Cannot assign ticket in status {ticket.status}")
    tech = db.get(User, payload.technician_id)
    if not tech or not tech.is_active or tech.role != "technician":
        raise HTTPException(status_code=400, detail="technician_id must be an active technician user")
    old_status = ticket.status
    ticket.technician_id = tech.id
    ticket.status = "ASSIGNED"
    _record(db, ticket, user.id, "assigned", old_status, "ASSIGNED", f"Assigned to technician {tech.id}")
    db.commit()
    return _detail(ticket.id, db)


@router.patch("/{ticket_id}/status", response_model=TicketDetail)
def change_status(
    ticket_id: int,
    payload: StatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = _detail(ticket_id, db)
    new_status = payload.status
    allowed = STATUS_VIA_STATUS.get(ticket.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition {ticket.status} -> {new_status}",
        )
    # Only the assigned technician (or admin/manager) may move the ticket
    if user.role == "technician" and ticket.technician_id != user.id:
        raise HTTPException(status_code=403, detail="Only the assigned technician can change status")
    if user.role not in ("technician", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
    old_status = ticket.status
    ticket.status = new_status
    now = datetime.now(timezone.utc)
    if new_status == "CLOSED":
        ticket.closed_at = now
    action = "closed" if new_status == "CLOSED" else "status"
    _record(db, ticket, user.id, action, old_status, new_status)
    db.commit()
    return _detail(ticket.id, db)


@router.patch("/{ticket_id}/resolve", response_model=TicketDetail)
def resolve_ticket(
    ticket_id: int,
    payload: ResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = _detail(ticket_id, db)
    if ticket.status not in ("IN_PROGRESS", "WAITING_CUSTOMER"):
        raise HTTPException(
            status_code=400,
            detail=f"Can only resolve from IN_PROGRESS or WAITING_CUSTOMER (current: {ticket.status})",
        )
    if user.role == "technician" and ticket.technician_id != user.id:
        raise HTTPException(status_code=403, detail="Only the assigned technician can resolve")
    if user.role not in ("technician", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
    old_status = ticket.status
    ticket.status = "RESOLVED"
    ticket.resolution = payload.resolution
    ticket.resolved_at = datetime.now(timezone.utc)
    _record(db, ticket, user.id, "resolved", old_status, "RESOLVED", payload.resolution[:200])
    db.commit()
    return _detail(ticket.id, db)
