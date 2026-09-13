from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    max_upload_chunk_size: int = 1024 * 1024  # 1 MB, tamaño de lectura al leer el stream de subida

    # --- Cloudflare R2 (almacenamiento de archivos, compatible con S3) ---
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str

    class Config:
        env_file = ".env"

    @property
    def r2_endpoint_url(self) -> str:
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"


settings = Settings()
