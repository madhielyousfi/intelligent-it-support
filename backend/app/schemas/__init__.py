from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# --- Auth ---
class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Users ---
class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str = ""
    role: Literal["customer", "technician", "manager", "admin"] = "customer"


class UserUpdate(BaseModel):
    email: str | None = None
    password: str | None = Field(default=None, min_length=6)
    full_name: str | None = None
    role: Literal["customer", "technician", "manager", "admin"] | None = None
    is_active: bool | None = None


# --- Customers ---
class CustomerDeviceCreate(BaseModel):
    device_type: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    model: str = Field(min_length=1)
    serial_number: str | None = None
    operating_system: str | None = None


class CustomerCreate(BaseModel):
    device: CustomerDeviceCreate | None = None
    name: str = Field(min_length=1)
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    user_id: int | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    user_id: int | None = None


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    company: str | None
    address: str | None
    user_id: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Devices ---
class DeviceCreate(BaseModel):
    customer_id: int
    device_type: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    model: str = Field(min_length=1)
    serial_number: str | None = None
    operating_system: str | None = None


class DeviceUpdate(BaseModel):
    device_type: str | None = Field(default=None, min_length=1)
    manufacturer: str | None = Field(default=None, min_length=1)
    model: str | None = Field(default=None, min_length=1)
    serial_number: str | None = None
    operating_system: str | None = None


class DeviceOut(BaseModel):
    id: int
    customer_id: int
    device_type: str
    manufacturer: str
    model: str
    serial_number: str | None
    operating_system: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Categories ---
class CategoryOut(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


# --- Tickets ---
class TicketCreate(BaseModel):
    customer_id: int
    device_id: int
    category_id: int
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"


class TicketPredictionIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)


class TicketPredictionOut(BaseModel):
    category: str | None = None
    confidence: float | None = None


class TicketHistoryOut(BaseModel):
    id: int
    action: str
    old_value: str | None
    new_value: str | None
    note: str | None
    user_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class TicketOut(BaseModel):
    id: int
    customer_id: int
    device_id: int | None
    category_id: int | None
    technician_id: int | None
    title: str
    description: str
    priority: str
    status: str
    ai_category: str | None
    ai_confidence: float | None
    resolution: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    closed_at: datetime | None
    customer_name: str
    device_name: str | None
    category_name: str | None
    technician_name: str | None

    class Config:
        from_attributes = True


class TicketDetail(TicketOut):
    history: list[TicketHistoryOut] = []


# --- Ticket workflow actions (Session 3: backend-enforced state machine) ---
class AssignIn(BaseModel):
    technician_id: int


class StatusIn(BaseModel):
    status: Literal["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]


class ResolveIn(BaseModel):
    resolution: str = Field(min_length=1)


class TechnicianOut(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True


class RecategorizeIn(BaseModel):
    category_id: int


class ArticleCreate(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    category_id: int | None = None


class ArticleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    content: str | None = Field(default=None, min_length=1)
    category_id: int | None = None


class ArticleOut(BaseModel):
    id: int
    title: str
    content: str
    category_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class SimilarTicketOut(BaseModel):
    id: int
    title: str
    status: str
    resolution: str | None

    class Config:
        from_attributes = True


class SuggestionsOut(BaseModel):
    similar: list[SimilarTicketOut] = []
    resolutions: list[str] = []
    articles: list[ArticleOut] = []
