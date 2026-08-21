from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    storage_path: str = "/data/storage"
    max_upload_chunk_size: int = 1024 * 1024  # 1 MB

    class Config:
        env_file = ".env"


settings = Settings()