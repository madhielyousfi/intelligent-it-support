"""Create all tables (Session 1 shortcut). Alembic takes over from Session 2."""

from app.core.database import engine
from app.models import Base  # noqa: F401 — registers all entities


def main() -> None:
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    print("Tables created.")


if __name__ == "__main__":
    main()
