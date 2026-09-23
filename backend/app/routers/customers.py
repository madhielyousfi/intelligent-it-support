from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Customer, Ticket, User
from app.schemas import CustomerCreate, CustomerOut, CustomerUpdate
from app.services import get_current_user, require_roles

router = APIRouter(prefix="/customers", tags=["customers"])


def customer_is_accessible(customer: Customer, user: User, db: Session) -> bool:
    if user.role in ("admin", "manager"):
        return True
    if user.role == "customer":
        return customer.user_id == user.id
    return db.query(Ticket.id).filter(
        Ticket.customer_id == customer.id, Ticket.technician_id == user.id
    ).first() is not None


def get_accessible_customer(customer_id: int, user: User, db: Session) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not customer_is_accessible(customer, user, db):
        raise HTTPException(status_code=403, detail="You are not authorized to access this customer")
    return customer


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    if payload.user_id is not None and not db.get(User, payload.user_id):
        raise HTTPException(status_code=400, detail="user_id does not exist")
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role in ("admin", "manager"):
        return db.query(Customer).order_by(Customer.id.desc()).all()
    if user.role == "customer":
        return db.query(Customer).filter(Customer.user_id == user.id).order_by(Customer.id.desc()).all()
    return db.query(Customer).join(Ticket, Ticket.customer_id == Customer.id).filter(
        Ticket.technician_id == user.id
    ).distinct().order_by(Customer.id.desc()).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_accessible_customer(customer_id, user, db)


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    changes = payload.model_dump(exclude_unset=True)
    if "user_id" in changes and changes["user_id"] is not None and not db.get(User, changes["user_id"]):
        raise HTTPException(status_code=400, detail="user_id does not exist")
    for field, value in changes.items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Cannot delete a customer with devices or tickets")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
