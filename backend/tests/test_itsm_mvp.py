from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models import Base, Category, Customer, Device, Ticket, User


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(engine)
    db = TestingSession()
    admin = User(email="admin@test.local", password_hash=hash_password("admin123"), full_name="Admin", role="admin")
    manager = User(email="manager@test.local", password_hash=hash_password("manager123"), full_name="Manager", role="manager")
    tech = User(email="tech@test.local", password_hash=hash_password("tech123"), full_name="Tech", role="technician")
    customer_user = User(email="customer@test.local", password_hash=hash_password("customer123"), full_name="Customer", role="customer")
    other_user = User(email="other@test.local", password_hash=hash_password("other123"), full_name="Other", role="customer")
    db.add_all([admin, manager, tech, customer_user, other_user])
    db.flush()
    customer = Customer(name="Ahmed", email="ahmed@test.local", user_id=customer_user.id, address="Rabat")
    other_customer = Customer(name="Sara", email="sara@test.local", user_id=other_user.id)
    category = Category(name="Network", description="Network support")
    db.add_all([customer, other_customer, category])
    db.flush()
    device = Device(customer_id=customer.id, device_type="Laptop", manufacturer="Dell", model="Latitude 5520", serial_number="D1", operating_system="Windows 11")
    other_device = Device(customer_id=other_customer.id, device_type="Laptop", manufacturer="HP", model="EliteBook", serial_number="D2", operating_system="Windows 11")
    db.add_all([device, other_device])
    db.commit()
    ids = {"admin": admin.id, "manager": manager.id, "tech": tech.id, "customer": customer.id, "other_customer": other_customer.id, "device": device.id, "other_device": other_device.id, "category": category.id}

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client, ids
    app.dependency_overrides.clear()
    db.close()
    Base.metadata.drop_all(engine)


def token(client, email, password):
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def ticket_payload(ids):
    return {"customer_id": ids["customer"], "device_id": ids["device"], "category_id": ids["category"], "title": "Wi-Fi unavailable", "description": "Cannot connect to office Wi-Fi", "priority": "HIGH"}


def create_ticket(client, ids):
    response = client.post("/tickets", json=ticket_payload(ids), headers=token(client, "admin@test.local", "admin123"))
    assert response.status_code == 201, response.text
    return response.json()


def test_health_auth_and_unauthenticated_requests(client):
    test_client, _ = client
    assert test_client.get("/health").json() == {"status": "ok"}
    assert test_client.post("/auth/login", json={"email": "admin@test.local", "password": "wrong"}).status_code == 401
    assert test_client.get("/tickets").status_code == 401


def test_admin_user_customer_device_and_category_management(client):
    test_client, ids = client
    admin = token(test_client, "admin@test.local", "admin123")
    user = test_client.post("/users", headers=admin, json={"email": "newtech@test.local", "password": "secret12", "full_name": "New Tech", "role": "technician"})
    assert user.status_code == 201
    assert test_client.patch(f"/users/{user.json()['id']}", headers=admin, json={"full_name": "Updated Tech"}).json()["full_name"] == "Updated Tech"
    category = test_client.post("/categories", headers=admin, json={"name": "VPN", "description": "VPN support"})
    assert category.status_code == 201
    assert test_client.patch(f"/categories/{category.json()['id']}", headers=admin, json={"description": "Updated"}).status_code == 200
    customer = test_client.post("/customers", headers=admin, json={"name": "New Customer", "email": "new@example.com", "phone": "0600000000", "company": "New Co", "address": "Rabat"})
    assert customer.status_code == 201
    assert test_client.patch(f"/customers/{customer.json()['id']}", headers=admin, json={"address": "Casablanca"}).json()["address"] == "Casablanca"
    device = test_client.post("/devices", headers=admin, json={"customer_id": customer.json()["id"], "device_type": "Laptop", "manufacturer": "Dell", "model": "XPS", "serial_number": "NEW1", "operating_system": "Windows 11"})
    assert device.status_code == 201
    assert test_client.post("/devices", headers=admin, json={"customer_id": 9999, "device_type": "Laptop", "manufacturer": "Dell", "model": "XPS"}).status_code == 400
    assert test_client.get("/users", headers=token(test_client, "tech@test.local", "tech123")).status_code == 403


def test_customer_boundaries_and_ticket_validation(client):
    test_client, ids = client
    customer_headers = token(test_client, "customer@test.local", "customer123")
    payload = ticket_payload(ids)
    assert test_client.post("/tickets", headers=customer_headers, json=payload).status_code == 201
    foreign_payload = {**payload, "customer_id": ids["other_customer"], "device_id": ids["other_device"]}
    assert test_client.post("/tickets", headers=customer_headers, json=foreign_payload).status_code == 403
    mismatched = {**payload, "device_id": ids["other_device"]}
    assert test_client.post("/tickets", headers=token(test_client, "admin@test.local", "admin123"), json=mismatched).status_code == 400
    foreign_ticket = test_client.post("/tickets", headers=token(test_client, "admin@test.local", "admin123"), json=foreign_payload).json()
    assert test_client.get(f"/tickets/{foreign_ticket['id']}", headers=customer_headers).status_code == 403
    assert test_client.patch(f"/tickets/{foreign_ticket['id']}/assign", headers=customer_headers, json={"technician_id": ids["tech"]}).status_code == 403


def test_ticket_filters_assignment_history_and_workflow(client):
    test_client, ids = client
    ticket = create_ticket(test_client, ids)
    admin = token(test_client, "admin@test.local", "admin123")
    assigned = test_client.patch(f"/tickets/{ticket['id']}/assign", headers=admin, json={"technician_id": ids["tech"]})
    assert assigned.status_code == 200
    assignment = assigned.json()["history"][-1]
    assert assignment["action"] == "ASSIGNED"
    assert assignment["old_value"] == "Unassigned"
    assert assignment["new_value"] == "Tech"
    assert len(test_client.get("/tickets", headers=token(test_client, "tech@test.local", "tech123")).json()) == 1
    assert test_client.get("/tickets?status=ASSIGNED&priority=HIGH", headers=admin).json()[0]["id"] == ticket["id"]
    assert test_client.get("/tickets?search=Wi-Fi", headers=admin).json()[0]["id"] == ticket["id"]
    assert test_client.get(f"/tickets?search={ticket['id']}", headers=admin).json()[0]["id"] == ticket["id"]
    paged = test_client.get("/tickets?page=1&page_size=1", headers=admin)
    assert paged.status_code == 200
    assert paged.headers["X-Total-Count"] == "1"
    assert len(paged.json()) == 1
    assert test_client.get(f"/tickets?technician_id={ids['tech']}", headers=admin).json()[0]["id"] == ticket["id"]
    assert test_client.get(f"/tickets?technician_id={ids['tech']}", headers=token(test_client, "tech@test.local", "tech123")).status_code == 403
    tech = token(test_client, "tech@test.local", "tech123")
    assert test_client.patch(f"/tickets/{ticket['id']}/status", headers=tech, json={"status": "CLOSED"}).status_code == 403
    assert test_client.patch(f"/tickets/{ticket['id']}/status", headers=admin, json={"status": "IN_PROGRESS"}).status_code == 200
    assert test_client.patch(f"/tickets/{ticket['id']}/status", headers=admin, json={"status": "WAITING_CUSTOMER"}).status_code == 200
    assert test_client.patch(f"/tickets/{ticket['id']}/status", headers=admin, json={"status": "IN_PROGRESS"}).status_code == 200
    resolved = test_client.patch(f"/tickets/{ticket['id']}/resolve", headers=admin, json={"resolution": "Reinstalled Wi-Fi driver"})
    assert resolved.status_code == 200
    assert resolved.json()["resolved_at"] is not None
    closed = test_client.patch(f"/tickets/{ticket['id']}/status", headers=admin, json={"status": "CLOSED"})
    assert closed.status_code == 200
    assert closed.json()["closed_at"] is not None
    assert [event["action"] for event in closed.json()["history"]] == ["CREATED", "ASSIGNED", "STATUS_CHANGED", "STATUS_CHANGED", "STATUS_CHANGED", "RESOLVED", "CLOSED"]


def test_ai_category_suggestion_is_non_binding_and_saved_on_creation(client, monkeypatch):
    test_client, ids = client
    monkeypatch.setattr("app.routers.tickets.predict", lambda title, description: ("Network", 0.91))
    admin = token(test_client, "admin@test.local", "admin123")
    prediction = test_client.post("/tickets/predict-category", headers=admin, json={
        "title": "Wi-Fi is unavailable", "description": "The office wireless network cannot be reached.",
    })
    assert prediction.status_code == 200
    assert prediction.json() == {"category": "Network", "confidence": 0.91}
    created = test_client.post("/tickets", headers=admin, json=ticket_payload(ids))
    assert created.status_code == 201
    assert created.json()["category_name"] == "Network"
    assert created.json()["ai_category"] == "Network"
    assert created.json()["ai_confidence"] == 0.91


def test_resolutions_are_reusable_solutions_and_articles_are_managed(client):
    test_client, ids = client
    admin = token(test_client, "admin@test.local", "admin123")
    source = create_ticket(test_client, ids)
    assert test_client.patch(f"/tickets/{source['id']}/assign", headers=admin, json={"technician_id": ids["tech"]}).status_code == 200
    tech = token(test_client, "tech@test.local", "tech123")
    assert test_client.patch(f"/tickets/{source['id']}/status", headers=admin, json={"status": "IN_PROGRESS"}).status_code == 200
    resolution = "Reinstalled the wireless network driver."
    assert test_client.patch(f"/tickets/{source['id']}/resolve", headers=admin, json={"resolution": resolution}).status_code == 200
    target = create_ticket(test_client, ids)
    suggestions = test_client.get(f"/tickets/{target['id']}/suggestions", headers=admin)
    assert suggestions.status_code == 200
    assert resolution in suggestions.json()["resolutions"]
    article = test_client.post("/articles", headers=admin, json={"title": "Wi-Fi recovery", "content": "Reconnect and reinstall the driver.", "category_id": ids["category"]})
    assert article.status_code == 201
    assert test_client.patch(f"/articles/{article.json()['id']}", headers=admin, json={"title": "Updated Wi-Fi recovery"}).status_code == 200
    assert test_client.post("/articles", headers=tech, json={"title": "No access", "content": "No access"}).status_code == 403
    assert test_client.delete(f"/articles/{article.json()['id']}", headers=admin).status_code == 204


def test_ocr_upload_is_authenticated_and_validates_images(client):
    test_client, _ = client
    assert test_client.post("/ocr/extract", files={"file": ("note.txt", b"hello", "text/plain")}).status_code == 401
    admin = token(test_client, "admin@test.local", "admin123")
    wrong_type = test_client.post("/ocr/extract", headers=admin, files={"file": ("note.txt", b"hello", "text/plain")})
    assert wrong_type.status_code == 400
    invalid_image = test_client.post("/ocr/extract", headers=admin, files={"file": ("bad.png", b"not-an-image", "image/png")})
    assert invalid_image.status_code == 400


def test_ticket_reassignment_records_both_technicians(client):
    test_client, ids = client
    admin = token(test_client, "admin@test.local", "admin123")
    second_tech = test_client.post("/users", headers=admin, json={"email": "second-tech@test.local", "password": "secret123", "full_name": "Second Tech", "role": "technician"}).json()
    ticket = create_ticket(test_client, ids)
    assert test_client.patch(f"/tickets/{ticket['id']}/assign", headers=admin, json={"technician_id": ids["tech"]}).status_code == 200
    reassigned = test_client.patch(f"/tickets/{ticket['id']}/assign", headers=admin, json={"technician_id": second_tech["id"]})
    assert reassigned.status_code == 200
    assert reassigned.json()["history"][-1]["old_value"] == "Tech"
    assert reassigned.json()["history"][-1]["new_value"] == "Second Tech"


def test_dashboard_is_live_and_scoped(client):
    test_client, ids = client
    before = test_client.get("/dashboard/stats", headers=token(test_client, "admin@test.local", "admin123")).json()["total"]
    ticket = create_ticket(test_client, ids)
    after = test_client.get("/dashboard/stats", headers=token(test_client, "admin@test.local", "admin123")).json()
    assert after["total"] == before + 1
    assert test_client.get("/dashboard/stats", headers=token(test_client, "customer@test.local", "customer123")).json()["total"] == 1
    assert ticket["status"] == "NEW"


def test_admin_status_roundtrip_filters_timestamps_and_history(client):
    test_client, ids = client
    admin = token(test_client, "admin@test.local", "admin123")
    ticket = create_ticket(test_client, ids)
    path = f"/tickets/{ticket['id']}"
    for status in ("IN_PROGRESS", "RESOLVED", "CLOSED", "OPEN", "CLOSED", "IN_PROGRESS", "OPEN"):
        response = test_client.patch(path + "/status", headers=admin, json={"status": status})
        assert response.status_code == 200, response.text
        updated = response.json()
        stored_status = "NEW" if status == "OPEN" else status
        assert updated["status"] == stored_status
        assert test_client.get(path, headers=admin).json()["status"] == stored_status
        filtered = test_client.get(f"/tickets?status={status}", headers=admin)
        assert filtered.headers["X-Total-Count"] == "1"
        assert filtered.json()[0]["id"] == ticket["id"]
        assert (updated["closed_at"] is not None) == (status == "CLOSED")
        if status == "RESOLVED":
            assert updated["resolved_at"] is not None
        elif status != "CLOSED":
            assert updated["resolved_at"] is None
        assert updated["history"][-1]["new_value"] == stored_status
        assert updated["history"][-1]["user_id"] == ids["admin"]
    before = test_client.get(path, headers=admin).json()
    unchanged = test_client.patch(path + "/status", headers=admin, json={"status": "OPEN"}).json()
    assert len(unchanged["history"]) == len(before["history"])
    assert test_client.patch(path + "/status", headers=admin, json={"status": "INVALID"}).status_code == 422
    assert test_client.patch("/tickets/99999/status", headers=admin, json={"status": "OPEN"}).status_code == 404
    assert test_client.get("/tickets?status=INVALID", headers=admin).status_code == 422


@pytest.mark.parametrize("email,password", [
    ("manager@test.local", "manager123"),
    ("tech@test.local", "tech123"),
    ("customer@test.local", "customer123"),
])
def test_non_admin_cannot_change_status_through_any_workflow_endpoint(client, email, password):
    test_client, ids = client
    ticket = create_ticket(test_client, ids)
    admin = token(test_client, "admin@test.local", "admin123")
    path = f"/tickets/{ticket['id']}"
    test_client.patch(path + "/assign", headers=admin, json={"technician_id": ids["tech"]})
    user = token(test_client, email, password)
    before = test_client.get(path, headers=admin).json()
    for status in ("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "WAITING_CUSTOMER"):
        assert test_client.patch(path + "/status", headers=user, json={"status": status}).status_code == 403
    assert test_client.patch(path + "/resolve", headers=user, json={"resolution": "Unauthorized"}).status_code == 403
    after = test_client.get(path, headers=admin).json()
    assert after == before
    assert test_client.patch(path + "/status", json={"status": "OPEN"}).status_code == 401


def test_open_filter_includes_legacy_states_and_all_customers(client):
    test_client, ids = client
    admin = token(test_client, "admin@test.local", "admin123")
    expected = []
    for status in ("NEW", "ASSIGNED", "WAITING_CUSTOMER", "RESOLVED"):
        ticket = create_ticket(test_client, ids)
        test_client.patch(f"/tickets/{ticket['id']}/status", headers=admin, json={"status": status})
        if status != "RESOLVED":
            expected.append(ticket["id"])
    payload = {**ticket_payload(ids), "customer_id": ids["other_customer"], "device_id": ids["other_device"]}
    foreign = test_client.post("/tickets", headers=admin, json=payload).json()
    expected.append(foreign["id"])
    response = test_client.get("/tickets?status=OPEN", headers=admin)
    assert {ticket["id"] for ticket in response.json()} == set(expected)
    assert response.headers["X-Total-Count"] == "4"
    manager = token(test_client, "manager@test.local", "manager123")
    fresh = create_ticket(test_client, ids)
    assignment = test_client.patch(f"/tickets/{fresh['id']}/assign", headers=manager, json={"technician_id": ids["tech"]})
    assert assignment.status_code == 200
    assert assignment.json()["status"] == "NEW"
