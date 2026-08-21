import uuid
import os
import aiofiles
from fastapi import UploadFile
from app.core.config import settings

CHUNK_SIZE = settings.max_upload_chunk_size


def build_storage_path(stored_name: str) -> str:
    return os.path.join(settings.storage_path, stored_name)


async def save_file_stream(upload_file: UploadFile) -> tuple[str, int]:
    """
    Guarda el archivo en disco leyendo por chunks, nunca cargando
    el fichero completo en memoria. Devuelve (stored_name, size_bytes).
    """
    extension = os.path.splitext(upload_file.filename)[1]
    stored_name = f"{uuid.uuid4()}{extension}"
    destination = build_storage_path(stored_name)

    size_bytes = 0
    async with aiofiles.open(destination, "wb") as out_file:
        while chunk := await upload_file.read(CHUNK_SIZE):
            await out_file.write(chunk)
            size_bytes += len(chunk)

    return stored_name, size_bytes


def delete_file_from_disk(stored_name: str) -> None:
    path = build_storage_path(stored_name)
    if os.path.exists(path):
        os.remove(path)