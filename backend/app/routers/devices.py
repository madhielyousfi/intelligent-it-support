from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Customer, Device, Ticket, User
from app.routers.customers import customer_is_accessible
from app.schemas import DeviceCreate, DeviceOut, DeviceUpdate
from app.services import get_current_user, require_roles

router = APIRouter(prefix="/devices", tags=["devices"])


def get_accessible_device(device_id: int, user: User, db: Session) -> Device:
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if not customer_is_accessible(device.customer, user, db):
        raise HTTPException(status_code=403, detail="You are not authorized to access this device")
    return device


@router.post("", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
def create_device(payload: DeviceCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    if not db.get(Customer, payload.customer_id):
        raise HTTPException(status_code=400, detail="customer_id does not exist: device requires an existing customer")
    device = Device(**payload.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("", response_model=list[DeviceOut])
def list_devices(customer_id: int | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Device)
    if user.role == "customer":
        q = q.join(Customer).filter(Customer.user_id == user.id)
    elif user.role == "technician":
        q = q.join(Ticket, Ticket.device_id == Device.id).filter(Ticket.technician_id == user.id).distinct()
    if customer_id is not None:
        q = q.filter(Device.customer_id == customer_id)
    return q.order_by(Device.id.desc()).all()


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(device_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_accessible_device(device_id, user, db)


@router.patch("/{device_id}", response_model=DeviceOut)
def update_device(
    device_id: int,
    payload: DeviceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(device_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Cannot delete a device used by tickets")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
