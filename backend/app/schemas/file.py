import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class FileOut(BaseModel):
    id: uuid.UUID
    original_name: str
    mime_type: str
    size_bytes: int
    folder_id: uuid.UUID | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class FileRename(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class FileMove(BaseModel):
    folder_id: uuid.UUID | None = None
