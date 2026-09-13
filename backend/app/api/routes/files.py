import uuid
from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.file import File
from app.models.folder import Folder
from app.schemas.file import FileOut, FileRename, FileMove
from app.services.storage_service import save_file_stream, delete_stored_file

router = APIRouter(prefix="/api/files", tags=["files"])


async def _get_owned_file(db: AsyncSession, file_id: uuid.UUID, owner_id: uuid.UUID) -> File:
    result = await db.execute(select(File).where(File.id == file_id, File.owner_id == owner_id))
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return db_file


async def _validate_folder(db: AsyncSession, folder_id: uuid.UUID | None, owner_id: uuid.UUID) -> None:
    if folder_id is None:
        return
    result = await db.execute(select(Folder.id).where(Folder.id == folder_id, Folder.owner_id == owner_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Carpeta no encontrada")


@router.post("/upload", response_model=FileOut, status_code=201)
async def upload_file(
    upload_file: UploadFile = FastAPIFile(...),
    folder_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _validate_folder(db, folder_id, current_user.id)

    stored_name, size_bytes = await save_file_stream(upload_file)

    db_file = File(
        original_name=upload_file.filename,
        stored_name=stored_name,
        mime_type=upload_file.content_type or "application/octet-stream",
        size_bytes=size_bytes,
        folder_id=folder_id,
        owner_id=current_user.id,
    )
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)
    return db_file


@router.get("/", response_model=list[FileOut])
async def list_files(
    folder_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(File).where(File.owner_id == current_user.id, File.folder_id == folder_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/{file_id}/rename", response_model=FileOut)
async def rename_file(
    file_id: uuid.UUID,
    payload: FileRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_file = await _get_owned_file(db, file_id, current_user.id)
    db_file.original_name = payload.name
    await db.commit()
    await db.refresh(db_file)
    return db_file


@router.patch("/{file_id}/move", response_model=FileOut)
async def move_file(
    file_id: uuid.UUID,
    payload: FileMove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_file = await _get_owned_file(db, file_id, current_user.id)
    await _validate_folder(db, payload.folder_id, current_user.id)
    db_file.folder_id = payload.folder_id
    await db.commit()
    await db.refresh(db_file)
    return db_file


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_file = await _get_owned_file(db, file_id, current_user.id)
    await delete_stored_file(db_file.stored_name)
    await db.delete(db_file)
    await db.commit()
