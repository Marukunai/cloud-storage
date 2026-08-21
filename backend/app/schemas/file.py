import uuid
from datetime import datetime
from pydantic import BaseModel


class FileOut(BaseModel):
    id: uuid.UUID
    original_name: str
    mime_type: str
    size_bytes: int
    folder_id: uuid.UUID | None = None
    created_at: datetime

    class Config:
        from_attributes = True