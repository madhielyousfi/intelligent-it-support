from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import articles, auth, categories, customers, dashboard, devices, health, ocr, tickets, users

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(ocr.router)
app.include_router(categories.router)
app.include_router(customers.router)
app.include_router(devices.router)
app.include_router(tickets.router)
app.include_router(users.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"app": settings.app_name, "docs": "/docs", "health": "/health"}
