from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATA_BACKEND: str = "firebase"
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:5173"
    CORE_BACKEND_URL: str = "http://localhost:8001"
    # BD del nucleo bancario para el puente de promocion (sync_outbox -> core)
    CORE_DATABASE_URL: str = (
        "postgresql://postgres:postgres@localhost:5432/bd_core_financiero"
    )
    PORT: int = 8003

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

settings = Settings()
