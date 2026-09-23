"""Idempotent development users, categories, and realistic ITSM sample data."""

from datetime import datetime, timezone

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Article, Category, Customer, Device, Solution, Ticket, TicketHistory, User

SEED_USERS = [
    {"email": "admin@example.com", "password": "admin123", "full_name": "Admin User", "role": "admin"},
    {"email": "manager@example.com", "password": "manager123", "full_name": "Manager User", "role": "manager"},
    {"email": "tech@example.com", "password": "tech123", "full_name": "Youssef Technician", "role": "technician"},
    {"email": "customer@example.com", "password": "customer123", "full_name": "Ahmed Customer", "role": "customer"},
]
SEED_CATEGORIES = ["Network", "Hardware", "Software", "Email", "Security", "Printer", "Account", "Other"]


def main() -> None:
    db = SessionLocal()
    try:
        for row in SEED_USERS:
            if not db.query(User).filter(User.email == row["email"]).first():
                db.add(User(email=row["email"], password_hash=hash_password(row["password"]), full_name=row["full_name"], role=row["role"]))
        for name in SEED_CATEGORIES:
            if not db.query(Category).filter(Category.name == name).first():
                db.add(Category(name=name, description=f"{name} support requests"))
        db.commit()

        linked_user = db.query(User).filter(User.email == "customer@example.com").one()
        customers = [
            {"name": "Ahmed Benali", "email": "ahmed@abc.com", "phone": "0612345678", "company": "ABC Company", "address": "Rabat, Morocco", "user_id": linked_user.id},
            {"name": "Sara Alaoui", "email": "sara@xyz.com", "phone": "0623456789", "company": "XYZ Company", "address": "Casablanca, Morocco"},
            {"name": "Omar Idrissi", "email": "omar@atlas.com", "phone": "0634567890", "company": "Atlas Services", "address": "Marrakesh, Morocco"},
        ]
        for row in customers:
            if not db.query(Customer).filter(Customer.email == row["email"]).first():
                db.add(Customer(**row))
        db.commit()
        customers_by_email = {customer.email: customer for customer in db.query(Customer).all()}
        categories_by_name = {category.name: category for category in db.query(Category).all()}
        admin = db.query(User).filter(User.email == "admin@example.com").one()
        article_rows = [
            ("Restore Wi-Fi connectivity", "Confirm the wireless adapter is enabled, reconnect to the approved SSID, then reinstall the Wi-Fi driver if the issue persists.", "Network"),
            ("Handle a locked account", "Verify the requester, unlock the account, reset the password, and confirm MFA registration before closing the request.", "Account"),
            ("Clear a stuck print queue", "Cancel queued jobs, restart the print spooler, verify printer connectivity, then send a small test page.", "Printer"),
        ]
        for title, content, category_name in article_rows:
            if not db.query(Article).filter(Article.title == title).first():
                db.add(Article(title=title, content=content, category_id=categories_by_name[category_name].id, created_by=admin.id))
        db.commit()

        device_rows = [
            ("ahmed@abc.com", "Laptop", "Dell", "Latitude 5520", "DELL123456", "Windows 11"),
            ("ahmed@abc.com", "Phone", "Apple", "iPhone 14", "IPHONE001", "iOS 18"),
            ("sara@xyz.com", "Desktop", "HP", "ProDesk 600", "HP600001", "Windows 11"),
            ("sara@xyz.com", "Printer", "HP", "LaserJet Pro", "HPPRINT01", "Firmware 5"),
            ("omar@atlas.com", "Laptop", "Lenovo", "ThinkPad T14", "LENOVO001", "Ubuntu 24.04"),
        ]
        for email, device_type, manufacturer, model, serial_number, operating_system in device_rows:
            if not db.query(Device).filter(Device.serial_number == serial_number).first():
                db.add(Device(customer_id=customers_by_email[email].id, device_type=device_type, manufacturer=manufacturer, model=model, serial_number=serial_number, operating_system=operating_system))
        db.commit()

        if not db.query(Ticket).first():
            technician = db.query(User).filter(User.email == "tech@example.com").one()
            devices = db.query(Device).order_by(Device.id).all()
            samples = [
                (0, "Network", "Wi-Fi not working", "Laptop cannot connect to office Wi-Fi.", "HIGH", "NEW", None),
                (1, "Account", "Password reset", "User is locked out of the customer portal.", "MEDIUM", "ASSIGNED", technician.id),
                (2, "Hardware", "Monitor flickering", "External monitor intermittently flickers.", "MEDIUM", "IN_PROGRESS", technician.id),
                (3, "Printer", "Printer queue stuck", "Documents remain in the print queue.", "LOW", "WAITING_CUSTOMER", technician.id),
                (4, "Software", "Application crash", "CRM closes while saving a record.", "HIGH", "RESOLVED", technician.id),
                (0, "Security", "MFA token expired", "Cannot complete multi-factor authentication.", "CRITICAL", "CLOSED", technician.id),
                (2, "Email", "Mailbox not receiving", "Expected inbound email has not arrived.", "MEDIUM", "NEW", None),
                (4, "Other", "Request assistance", "General IT assistance is required.", "LOW", "ASSIGNED", technician.id),
            ]
            for index, category_name, title, description, priority, ticket_status, technician_id in samples:
                device = devices[index]
                resolved_at = datetime.now(timezone.utc) if ticket_status in ("RESOLVED", "CLOSED") else None
                resolution = "Issue resolved during seeded support session." if resolved_at else None
                ticket = Ticket(customer_id=device.customer_id, device_id=device.id, category_id=categories_by_name[category_name].id, technician_id=technician_id, title=title, description=description, priority=priority, status=ticket_status, resolution=resolution, resolved_at=resolved_at, closed_at=resolved_at if ticket_status == "CLOSED" else None)
                db.add(ticket)
                db.flush()
                db.add(TicketHistory(ticket_id=ticket.id, user_id=admin.id, action="CREATED", old_value=None, new_value="NEW", note="Seed ticket created"))
                if resolution:
                    db.add(Solution(ticket_id=ticket.id, content=resolution, created_by=technician_id))
            db.commit()
        print("Seed OK:", [row["email"] for row in SEED_USERS])
    finally:
        db.close()


if __name__ == "__main__":
    main()
