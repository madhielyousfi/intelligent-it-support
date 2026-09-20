"""Seed dev users + base categories. Idempotent."""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Category, User

SEED_USERS = [
    {"email": "admin@itsm.local", "password": "admin123", "full_name": "Admin", "role": "admin"},
    {"email": "tech@itsm.local", "password": "tech123", "full_name": "Technician", "role": "technician"},
    {"email": "manager@itsm.local", "password": "manager123", "full_name": "Manager", "role": "manager"},
]

SEED_CATEGORIES = ["Network", "Hardware", "Software", "Access", "Email"]


def main() -> None:
    db = SessionLocal()
    try:
        for u in SEED_USERS:
            if not db.query(User).filter(User.email == u["email"]).first():
                db.add(
                    User(
                        email=u["email"],
                        hashed_password=hash_password(u["password"]),
                        full_name=u["full_name"],
                        role=u["role"],
                    )
                )
        for name in SEED_CATEGORIES:
            if not db.query(Category).filter(Category.name == name).first():
                db.add(Category(name=name, description=f"{name} issues"))
        db.commit()
        print("Seed OK:", [u["email"] for u in SEED_USERS])
    finally:
        db.close()


if __name__ == "__main__":
    main()
