import os
import re
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.file import File
from app.services.storage_service import build_storage_path

router = APIRouter(prefix="/api/stream", tags=["stream"])

RANGE_RE = re.compile(r"bytes=(\d+)-(\d*)")
CHUNK_SIZE = 1024 * 1024  # 1 MB por chunk enviado al cliente


@router.get("/{file_id}")
async def stream_file(
    file_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(File).where(File.id == file_id, File.owner_id == current_user.id))
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    path = build_storage_path(db_file.stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Archivo físico no encontrado")

    file_size = db_file.size_bytes
    range_header = request.headers.get("range")

    start = 0
    end = file_size - 1

    if range_header:
        match = RANGE_RE.match(range_header)
        if match:
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else file_size - 1

    async def file_iterator():
        async with aiofiles.open(path, "rb") as f:
            await f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                read_size = min(CHUNK_SIZE, remaining)
                data = await f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(end - start + 1),
    }
    status_code = 206 if range_header else 200

    return StreamingResponse(
        file_iterator(),
        status_code=status_code,
        media_type=db_file.mime_type,
        headers=headers,
    )