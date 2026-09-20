from datetime import datetime

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

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str = ""
    role: str = "customer"


# --- Customers ---
class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    user_id: int | None = None


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    company: str | None
    user_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Devices ---
class DeviceCreate(BaseModel):
    customer_id: int
    hostname: str = Field(min_length=1)
    device_type: str = "laptop"
    os: str | None = None
    serial_number: str | None = None


class DeviceOut(BaseModel):
    id: int
    customer_id: int
    hostname: str
    device_type: str
    os: str | None
    serial_number: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Categories ---
class CategoryOut(BaseModel):
    id: int
    name: str
    description: str | None

    class Config:
        from_attributes = True


# --- Tickets ---
class TicketCreate(BaseModel):
    customer_id: int
    device_id: int | None = None
    category_id: int | None = None
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: str = "MEDIUM"


class TicketHistoryOut(BaseModel):
    id: int
    action: str
    old_value: str | None
    new_value: str | None
    note: str | None
    actor_id: int | None
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

    class Config:
        from_attributes = True


class TicketDetail(TicketOut):
    history: list[TicketHistoryOut] = []


# --- Ticket workflow actions (Session 3: backend-enforced state machine) ---
class AssignIn(BaseModel):
    technician_id: int


class StatusIn(BaseModel):
    status: str


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
