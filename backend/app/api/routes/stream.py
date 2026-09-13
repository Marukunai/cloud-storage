import asyncio
import uuid

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.file import File
from app.services.storage_service import get_s3_client

router = APIRouter(prefix="/api/stream", tags=["stream"])

READ_CHUNK_SIZE = 1024 * 1024  # 1 MB por chunk enviado al cliente


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

    s3 = get_s3_client()
    range_header = request.headers.get("range")

    get_kwargs = {"Bucket": settings.r2_bucket_name, "Key": db_file.stored_name}
    if range_header:
        # R2/S3 acepta la cabecera Range tal cual la manda el navegador
        # (incluye el caso "bytes=-500", que la implementación local
        # anterior no manejaba), así que no hace falta parsearla a mano.
        get_kwargs["Range"] = range_header

    try:
        obj = await asyncio.to_thread(s3.get_object, **get_kwargs)
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code in ("NoSuchKey", "404"):
            raise HTTPException(status_code=404, detail="Archivo físico no encontrado") from exc
        raise

    body = obj["Body"]  # botocore.response.StreamingBody: sync, hay que leerlo en un hilo

    async def iterate_body():
        try:
            while True:
                chunk = await asyncio.to_thread(body.read, READ_CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk
        finally:
            body.close()

    headers = {"Accept-Ranges": "bytes"}
    if "ContentRange" in obj:
        headers["Content-Range"] = obj["ContentRange"]
    if "ContentLength" in obj:
        headers["Content-Length"] = str(obj["ContentLength"])

    status_code = obj["ResponseMetadata"]["HTTPStatusCode"]

    return StreamingResponse(
        iterate_body(),
        status_code=status_code,
        media_type=db_file.mime_type,
        headers=headers,
    )
