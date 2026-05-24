from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    # Postgres settings kept for future use; app runs on SQLite only
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "shipper"
    POSTGRES_PASSWORD: str = "shipper"
    POSTGRES_DB: str = "shipper"

    # Redis no longer required — JWT blacklist uses SQLite (see database/redis.py)
    # REDIS_PORT: int = 6379
    # REDIS_HOST: str = "127.0.0.1"

    model_config = SettingsConfigDict(
        env_file="./.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    @property
    def POSTGRES_URL(self):
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def SQLITE_URL(self):
        return "sqlite+aiosqlite:///./shipper_Test.db"


class SecuritySettings(BaseSettings):
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file="./.env",
        env_ignore_empty=True,
        extra="ignore",
    )


security_settings = SecuritySettings()
db_settings = DatabaseSettings()
