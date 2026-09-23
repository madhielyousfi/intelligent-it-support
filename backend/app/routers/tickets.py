from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import String, cast, func, or_
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Article, Category, Customer, Device, Solution, Ticket, TicketHistory, User
from app.schemas import AssignIn, RecategorizeIn, ResolveIn, SimilarTicketOut, StatusIn, SuggestionsOut, TicketCreate, TicketDetail, TicketOut, TicketPredictionIn, TicketPredictionOut
from app.services import get_current_user, require_roles
from app.services.classifier import predict

router = APIRouter(prefix="/tickets", tags=["tickets"])

STATUS_VIA_STATUS = {
    "ASSIGNED": {"IN_PROGRESS"},
    "IN_PROGRESS": {"WAITING_CUSTOMER"},
    "WAITING_CUSTOMER": {"IN_PROGRESS"},
    "RESOLVED": {"CLOSED"},
}


def ticket_is_accessible(ticket: Ticket, user: User) -> bool:
    if user.role in ("admin", "manager"):
        return True
    if user.role == "technician":
        return ticket.technician_id == user.id
    return ticket.customer.user_id == user.id


def _detail(ticket_id: int, db: Session, user: User | None = None) -> Ticket:
    ticket = db.query(Ticket).options(
        selectinload(Ticket.history), selectinload(Ticket.customer), selectinload(Ticket.device), selectinload(Ticket.category)
    ).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user is not None and not ticket_is_accessible(ticket, user):
        raise HTTPException(status_code=403, detail="You are not authorized to access this ticket")
    return ticket


def _record(db: Session, ticket: Ticket, user_id: int | None, action: str, old: str | None, new: str | None, note: str | None = None) -> None:
    db.add(TicketHistory(ticket_id=ticket.id, user_id=user_id, action=action, old_value=old, new_value=new, note=note))


def _assert_ticket_creation_allowed(customer: Customer, user: User) -> None:
    if user.role in ("admin", "manager"):
        return
    if user.role == "customer" and customer.user_id == user.id:
        return
    raise HTTPException(status_code=403, detail="You are not authorized to create a ticket for this customer")


def _predict_existing_category(db: Session, title: str, description: str) -> tuple[str | None, float | None]:
    """Only return labels which exist in this installation's category catalogue."""
    label, confidence = predict(title, description)
    if label is None or confidence is None:
        return None, None
    if not db.query(Category.id).filter(Category.name == label).first():
        return None, None
    return label, confidence


@router.post("/predict-category", response_model=TicketPredictionOut)
def predict_category(payload: TicketPredictionIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return a non-binding category suggestion for a draft ticket."""
    category, confidence = _predict_existing_category(db, payload.title, payload.description)
    return TicketPredictionOut(category=category, confidence=confidence)


@router.post("", response_model=TicketDetail, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=400, detail="customer_id does not exist")
    _assert_ticket_creation_allowed(customer, user)
    device = db.get(Device, payload.device_id)
    if not device:
        raise HTTPException(status_code=400, detail="device_id does not exist")
    if device.customer_id != customer.id:
        raise HTTPException(status_code=400, detail="device does not belong to this customer")
    if not db.get(Category, payload.category_id):
        raise HTTPException(status_code=400, detail="category_id does not exist")

    ai_category, ai_confidence = _predict_existing_category(db, payload.title, payload.description)
    ticket = Ticket(
        **payload.model_dump(), status="NEW", technician_id=None,
        ai_category=ai_category, ai_confidence=ai_confidence,
    )
    db.add(ticket)
    db.flush()
    _record(db, ticket, user.id, "CREATED", None, "NEW", "Ticket created")
    db.commit()
    return _detail(ticket.id, db, user)


@router.get("", response_model=list[TicketOut])
def list_tickets(
    status: Literal["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] | None = None,
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] | None = None,
    customer_id: int | None = None,
    technician_id: int | None = None,
    search: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    page: int = Query(1, ge=1, description="One-based page number"),
    page_size: int = Query(10, ge=1, le=100, description="Tickets per page"),
    response: Response = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Ticket)
    if user.role == "customer":
        q = q.join(Customer).filter(Customer.user_id == user.id)
    elif user.role == "technician":
        q = q.filter(Ticket.technician_id == user.id)
    if status is not None:
        q = q.filter(Ticket.status == status)
    if priority is not None:
        q = q.filter(Ticket.priority == priority)
    if customer_id is not None:
        q = q.filter(Ticket.customer_id == customer_id)
    if technician_id is not None:
        if user.role not in ("admin", "manager"):
            raise HTTPException(status_code=403, detail="Only managers and administrators can filter by technician")
        q = q.filter(Ticket.technician_id == technician_id)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        q = q.filter(or_(
            Ticket.title.ilike(pattern),
            Ticket.description.ilike(pattern),
            cast(Ticket.id, String).ilike(pattern),
        ))
    if created_from is not None:
        q = q.filter(func.date(Ticket.created_at) >= created_from)
    if created_to is not None:
        q = q.filter(func.date(Ticket.created_at) <= created_to)

    total = q.count()
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)
    return q.order_by(Ticket.id.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.get("/{ticket_id}", response_model=TicketDetail)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _detail(ticket_id, db, user)


@router.patch("/{ticket_id}/assign", response_model=TicketDetail)
def assign_ticket(ticket_id: int, payload: AssignIn, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "manager"))):
    ticket = _detail(ticket_id, db, user)
    if ticket.status not in ("NEW", "ASSIGNED"):
        raise HTTPException(status_code=400, detail=f"Cannot assign ticket in status {ticket.status}")
    tech = db.get(User, payload.technician_id)
    if not tech or not tech.is_active or tech.role != "technician":
        raise HTTPException(status_code=400, detail="technician_id must be an active technician user")
    old_technician = ticket.technician.full_name if ticket.technician else "Unassigned"
    ticket.technician_id = tech.id
    if ticket.status == "NEW":
        ticket.status = "ASSIGNED"
    _record(db, ticket, user.id, "ASSIGNED", old_technician, tech.full_name, f"Assigned by {user.full_name}")
    db.commit()
    return _detail(ticket.id, db, user)


@router.patch("/{ticket_id}/status", response_model=TicketDetail)
def change_status(ticket_id: int, payload: StatusIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = _detail(ticket_id, db, user)
    if user.role not in ("technician", "admin", "manager"):
        raise HTTPException(status_code=403, detail="You are not authorized to change ticket status")
    new_status = payload.status
    if new_status not in STATUS_VIA_STATUS.get(ticket.status, set()):
        raise HTTPException(status_code=400, detail=f"Invalid transition {ticket.status} -> {new_status}")
    old_status = ticket.status
    ticket.status = new_status
    if new_status == "CLOSED":
        ticket.closed_at = datetime.now(timezone.utc)
    _record(db, ticket, user.id, "CLOSED" if new_status == "CLOSED" else "STATUS_CHANGED", old_status, new_status)
    db.commit()
    return _detail(ticket.id, db, user)


@router.patch("/{ticket_id}/resolve", response_model=TicketDetail)
def resolve_ticket(ticket_id: int, payload: ResolveIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = _detail(ticket_id, db, user)
    if user.role not in ("technician", "admin", "manager"):
        raise HTTPException(status_code=403, detail="You are not authorized to resolve tickets")
    if ticket.status not in ("IN_PROGRESS", "WAITING_CUSTOMER"):
        raise HTTPException(status_code=400, detail=f"Can only resolve from IN_PROGRESS or WAITING_CUSTOMER (current: {ticket.status})")
    old_status = ticket.status
    ticket.status = "RESOLVED"
    ticket.resolution = payload.resolution
    ticket.resolved_at = datetime.now(timezone.utc)
    db.add(Solution(ticket_id=ticket.id, content=payload.resolution, created_by=user.id))
    _record(db, ticket, user.id, "RESOLVED", old_status, "RESOLVED", payload.resolution)
    db.commit()
    return _detail(ticket.id, db, user)


# Preserved advanced knowledge-base endpoints. They apply the same ticket visibility rules.
@router.get("/{ticket_id}/similar", response_model=list[SimilarTicketOut])
def similar_tickets(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = _detail(ticket_id, db, user)
    rows = db.query(Ticket).filter(Ticket.category_id == ticket.category_id, Ticket.id != ticket.id).order_by(Ticket.id.desc()).limit(5).all()
    return [SimilarTicketOut.model_validate(row) for row in rows if ticket_is_accessible(row, user)]


@router.get("/{ticket_id}/suggestions", response_model=SuggestionsOut)
def suggested_solutions(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = _detail(ticket_id, db, user)
    similar = db.query(Ticket).filter(Ticket.category_id == ticket.category_id, Ticket.id != ticket.id).order_by(Ticket.id.desc()).limit(5).all()
    visible = [row for row in similar if ticket_is_accessible(row, user)]
    stored_solutions = db.query(Solution).join(Solution.ticket).filter(
        Ticket.category_id == ticket.category_id, Ticket.id != ticket.id,
    ).order_by(Solution.created_at.desc()).limit(10).all()
    resolutions: list[str] = []
    for solution in stored_solutions:
        if ticket_is_accessible(solution.ticket, user) and solution.content not in resolutions:
            resolutions.append(solution.content)
    # Retain useful fixes from tickets created before Phase 2 wrote Solution rows.
    for row in visible:
        if row.resolution and row.resolution not in resolutions:
            resolutions.append(row.resolution)
    articles = db.query(Article).filter(Article.category_id == ticket.category_id).order_by(Article.id.desc()).limit(5).all()
    return SuggestionsOut(similar=[SimilarTicketOut.model_validate(row) for row in visible], resolutions=resolutions[:5], articles=articles)


@router.patch("/{ticket_id}/recategorize", response_model=TicketDetail)
def recategorize_ticket(ticket_id: int, payload: RecategorizeIn, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "manager"))):
    ticket = _detail(ticket_id, db, user)
    category = db.get(Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="category_id does not exist")
    old_name = ticket.category.name if ticket.category else None
    ticket.category_id = category.id
    _record(db, ticket, user.id, "RECATEGORIZED", old_name, category.name)
    db.commit()
    return _detail(ticket.id, db, user)
