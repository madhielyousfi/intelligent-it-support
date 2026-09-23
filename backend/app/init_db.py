"""Deprecated compatibility entry point.

Use ``alembic upgrade head`` to create or update the schema.  The application
does not use SQLAlchemy ``create_all`` for production databases.
"""


def main() -> None:
    raise SystemExit("Use 'alembic upgrade head' instead of python -m app.init_db")


if __name__ == "__main__":
    main()
