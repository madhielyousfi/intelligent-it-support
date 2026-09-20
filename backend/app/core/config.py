from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Intelligent IT Support API"
    debug: bool = True
    database_url: str = "postgresql+psycopg://itsm:itsm_dev_password@localhost:5433/itsm_db"
    secret_key: str = "change-me-in-production-use-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
