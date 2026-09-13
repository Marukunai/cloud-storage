import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.folder import Folder
from app.models.file import File
from app.schemas.folder import FolderCreate, FolderRename, FolderMove, FolderOut
from app.services.storage_service import delete_stored_file

router = APIRouter(prefix="/api/folders", tags=["folders"])


async def _get_owned_folder(db: AsyncSession, folder_id: uuid.UUID, owner_id: uuid.UUID) -> Folder:
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.owner_id == owner_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Carpeta no encontrada")
    return folder


async def _validate_parent(db: AsyncSession, parent_id: uuid.UUID | None, owner_id: uuid.UUID) -> None:
    if parent_id is None:
        return
    result = await db.execute(select(Folder.id).where(Folder.id == parent_id, Folder.owner_id == owner_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Carpeta padre no encontrada")


async def _name_taken(
    db: AsyncSession,
    owner_id: uuid.UUID,
    parent_id: uuid.UUID | None,
    name: str,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    query = select(Folder.id).where(
        Folder.owner_id == owner_id,
        Folder.parent_id == parent_id,
        Folder.name == name,
    )
    if exclude_id is not None:
        query = query.where(Folder.id != exclude_id)
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def _collect_subtree_ids(db: AsyncSession, root_id: uuid.UUID) -> set[uuid.UUID]:
    """BFS: devuelve el propio folder_id y el de todos sus descendientes."""
    subtree = {root_id}
    frontier = [root_id]
    while frontier:
        result = await db.execute(select(Folder.id).where(Folder.parent_id.in_(frontier)))
        children = [row[0] for row in result.all()]
        new_ids = [cid for cid in children if cid not in subtree]
        subtree.update(new_ids)
        frontier = new_ids
    return subtree


@router.post("/", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    payload: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _validate_parent(db, payload.parent_id, current_user.id)

    if await _name_taken(db, current_user.id, payload.parent_id, payload.name):
        raise HTTPException(status_code=409, detail="Ya existe una carpeta con ese nombre en esta ubicación")

    folder = Folder(name=payload.name, parent_id=payload.parent_id, owner_id=current_user.id)
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.get("/", response_model=list[FolderOut])
async def list_folders(
    parent_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Folder).where(Folder.owner_id == current_user.id, Folder.parent_id == parent_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{folder_id}", response_model=FolderOut)
async def get_folder(
    folder_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_owned_folder(db, folder_id, current_user.id)


@router.patch("/{folder_id}/rename", response_model=FolderOut)
async def rename_folder(
    folder_id: uuid.UUID,
    payload: FolderRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = await _get_owned_folder(db, folder_id, current_user.id)

    if await _name_taken(db, current_user.id, folder.parent_id, payload.name, exclude_id=folder.id):
        raise HTTPException(status_code=409, detail="Ya existe una carpeta con ese nombre en esta ubicación")

    folder.name = payload.name
    await db.commit()
    await db.refresh(folder)
    return folder


@router.patch("/{folder_id}/move", response_model=FolderOut)
async def move_folder(
    folder_id: uuid.UUID,
    payload: FolderMove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = await _get_owned_folder(db, folder_id, current_user.id)
    await _validate_parent(db, payload.parent_id, current_user.id)

    if payload.parent_id is not None:
        subtree = await _collect_subtree_ids(db, folder.id)
        if payload.parent_id in subtree:
            raise HTTPException(
                status_code=400,
                detail="No se puede mover una carpeta dentro de sí misma o de una de sus subcarpetas",
            )

    if await _name_taken(db, current_user.id, payload.parent_id, folder.name, exclude_id=folder.id):
        raise HTTPException(status_code=409, detail="Ya existe una carpeta con ese nombre en esta ubicación")

    folder.parent_id = payload.parent_id
    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = await _get_owned_folder(db, folder_id, current_user.id)

    subtree_ids = await _collect_subtree_ids(db, folder.id)

    result = await db.execute(select(File.stored_name).where(File.folder_id.in_(subtree_ids)))
    for (stored_name,) in result.all():
        await delete_stored_file(stored_name)

    await db.delete(folder)
    await db.commit()
