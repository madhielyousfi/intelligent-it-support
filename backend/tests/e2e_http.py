"""Reproducible HTTP acceptance test for a running Milestone 1 API.

Run after migrations and seed data:
    ITSM_BASE_URL=http://127.0.0.1:8000 python tests/e2e_http.py
"""

import os
from uuid import uuid4

import httpx


BASE_URL = os.environ.get("ITSM_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def request(client: httpx.Client, method: str, path: str, expected: int, **kwargs):
    response = client.request(method, f"{BASE_URL}{path}", **kwargs)
    assert response.status_code == expected, f"{method} {path}: {response.status_code} {response.text}"
    return response.json() if response.content else None


def login(client: httpx.Client, email: str, password: str) -> dict[str, str]:
    token = request(client, "POST", "/auth/login", 200, json={"email": email, "password": password})["access_token"]
    return {"Authorization": f"Bearer {token}"}


def main() -> None:
    suffix = uuid4().hex[:8]
    with httpx.Client(timeout=10) as client:
        assert request(client, "GET", "/health", 200) == {"status": "ok"}
        admin = login(client, "admin@example.com", "admin123")
        dashboard_total_before = request(client, "GET", "/dashboard/stats", 200, headers=admin)["total"]
        technician = request(client, "POST", "/users", 201, headers=admin, json={
            "email": f"e2e-tech-{suffix}@example.com", "password": "secret123", "full_name": "E2E Technician", "role": "technician"
        })
        customer = request(client, "POST", "/customers", 201, headers=admin, json={
            "name": "E2E Customer", "email": f"e2e-customer-{suffix}@example.com", "phone": "0600000000", "company": "E2E Company", "address": "Rabat"
        })
        device = request(client, "POST", "/devices", 201, headers=admin, json={
            "customer_id": customer["id"], "device_type": "Laptop", "manufacturer": "Dell", "model": "Latitude 5520", "serial_number": f"E2E-{suffix}", "operating_system": "Windows 11"
        })
        categories = request(client, "GET", "/categories", 200, headers=admin)
        category = next(category for category in categories if category["name"] == "Network")
        ticket = request(client, "POST", "/tickets", 201, headers=admin, json={
            "customer_id": customer["id"], "device_id": device["id"], "category_id": category["id"], "title": "Wi-Fi not working", "description": "Cannot reach office Wi-Fi", "priority": "HIGH"
        })
        assert ticket["status"] == "NEW"
        request(client, "PATCH", f"/tickets/{ticket['id']}/assign", 200, headers=admin, json={"technician_id": technician["id"]})
        tech_headers = login(client, technician["email"], "secret123")
        assigned = request(client, "GET", "/tickets?status=ASSIGNED&priority=HIGH", 200, headers=tech_headers)
        assert len(assigned) == 1 and assigned[0]["id"] == ticket["id"]
        request(client, "PATCH", f"/tickets/{ticket['id']}/status", 403, headers=tech_headers, json={"status": "IN_PROGRESS"})
        request(client, "PATCH", f"/tickets/{ticket['id']}/status", 200, headers=admin, json={"status": "IN_PROGRESS"})
        request(client, "PATCH", f"/tickets/{ticket['id']}/status", 200, headers=admin, json={"status": "WAITING_CUSTOMER"})
        request(client, "PATCH", f"/tickets/{ticket['id']}/status", 200, headers=admin, json={"status": "IN_PROGRESS"})
        request(client, "PATCH", f"/tickets/{ticket['id']}/resolve", 200, headers=admin, json={"resolution": "Reinstalled Wi-Fi driver"})
        closed = request(client, "PATCH", f"/tickets/{ticket['id']}/status", 200, headers=admin, json={"status": "CLOSED"})
        assert closed["status"] == "CLOSED" and closed["resolved_at"] and closed["closed_at"]
        assert [entry["action"] for entry in closed["history"]] == ["CREATED", "ASSIGNED", "STATUS_CHANGED", "STATUS_CHANGED", "STATUS_CHANGED", "RESOLVED", "CLOSED"]
        assert request(client, "GET", "/dashboard/stats", 200, headers=admin)["total"] == dashboard_total_before + 1
    print("Milestone 1 HTTP end-to-end workflow passed")


if __name__ == "__main__":
    main()
