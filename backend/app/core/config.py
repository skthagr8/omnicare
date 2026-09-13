from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://omnicare:omnicare_dev@localhost:5432/omnicare",
        env="DATABASE_URL"
    )
    
    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379",
        env="REDIS_URL"
    )
    
    # Security
    secret_key: str = Field(
        default="dev_secret_key_change_in_production",
        env="SECRET_KEY"
    )
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=30,
        env="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    refresh_token_expire_days: int = Field(
        default=7,
        env="REFRESH_TOKEN_EXPIRE_DAYS"
    )
    
    # Twilio
    twilio_account_sid: Optional[str] = Field(default=None, env="TWILIO_ACCOUNT_SID")
    twilio_auth_token: Optional[str] = Field(default=None, env="TWILIO_AUTH_TOKEN")
    twilio_phone_number: Optional[str] = Field(default=None, env="TWILIO_PHONE_NUMBER")
    
    # ML Models
    model_path: str = Field(
        default="/app/ml_pipeline/models",
        env="MODEL_PATH"
    )
    model_version: str = Field(default="1.0.0", env="MODEL_VERSION")
    
    # Application
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True, env="DEBUG")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Geofencing
    max_checkin_distance: int = Field(
        default=100,
        env="MAX_CHECKIN_DISTANCE"
    )
    emergency_risk_threshold: float = Field(
        default=0.75,
        env="EMERGENCY_RISK_THRESHOLD"
    )
    
    # Monitoring
    prometheus_enabled: bool = Field(
        default=True,
        env="PROMETHEUS_ENABLED"
    )
    
    @property
    def is_development(self) -> bool:
        return self.environment == "development"
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
