import asyncio
import os
import uuid

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.core.config import settings

_s3_client = None


def get_s3_client():
    """Cliente S3 (boto3) apuntando al endpoint compatible con S3 de Cloudflare R2."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
    return _s3_client


async def save_file_stream(upload_file: UploadFile) -> tuple[str, int]:
    """
    Sube el archivo a Cloudflare R2 (almacenamiento compatible con S3).

    Starlette ya recibe el cuerpo de la petición en un SpooledTemporaryFile
    (a partir de cierto tamaño lo vuelca a disco temporal en vez de tenerlo
    entero en RAM), así que upload_file.file es un fichero normal que boto3
    puede subir con upload_fileobj, que hace el multipart upload solo (en
    trozos de 8 MB: R2/S3 exige un mínimo de 5 MB por parte, así que no se
    puede usar el MAX_UPLOAD_CHUNK_SIZE de 1 MB pensado para otra cosa).

    boto3 es síncrono (no tiene soporte nativo de asyncio): la subida se
    ejecuta en un hilo aparte con asyncio.to_thread para no bloquear el
    event loop —y con él, a todos los demás usuarios— mientras dura una
    subida larga.
    """
    extension = os.path.splitext(upload_file.filename)[1]
    stored_name = f"{uuid.uuid4()}{extension}"
    s3 = get_s3_client()

    def _upload() -> int:
        upload_file.file.seek(0)
        s3.upload_fileobj(
            upload_file.file,
            settings.r2_bucket_name,
            stored_name,
            Config=TransferConfig(
                multipart_threshold=8 * 1024 * 1024,
                multipart_chunksize=8 * 1024 * 1024,
            ),
        )
        return upload_file.file.seek(0, os.SEEK_END)

    size_bytes = await asyncio.to_thread(_upload)
    return stored_name, size_bytes


async def delete_stored_file(stored_name: str) -> None:
    """Borra el objeto de R2. No falla si ya no existe: el objetivo es que no exista."""
    s3 = get_s3_client()

    def _delete() -> None:
        try:
            s3.delete_object(Bucket=settings.r2_bucket_name, Key=stored_name)
        except ClientError:
            pass

    await asyncio.to_thread(_delete)
