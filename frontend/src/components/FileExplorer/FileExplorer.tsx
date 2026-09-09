"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { ApiError, streamUrl } from "@/lib/api";
import type { Folder, FileItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { UploadDropzone } from "@/components/UploadDropzone";
import { MediaPlayer } from "@/components/MediaPlayer";

interface FileExplorerProps {
  folderId: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isPlayable(mime: string): boolean {
  return mime.startsWith("video/") || mime.startsWith("audio/");
}

export function FileExplorer({ folderId }: FileExplorerProps) {
  const router = useRouter();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Folder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  const [renaming, setRenaming] = useState<{ type: "folder" | "file"; id: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [playingFile, setPlayingFile] = useState<FileItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [foldersRes, filesRes] = await Promise.all([
        api.listFolders(folderId),
        api.listFiles(folderId),
      ]);
      setFolders(foldersRes);
      setFiles(filesRes);

      if (folderId) {
        const chain: Folder[] = [];
        let current = await api.getFolder(folderId);
        chain.unshift(current);
        while (current.parent_id) {
          current = await api.getFolder(current.parent_id);
          chain.unshift(current);
        }
        setFolder(chain[chain.length - 1]);
        setBreadcrumb(chain);
      } else {
        setFolder(null);
        setBreadcrumb([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la carpeta");
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      await api.createFolder(newFolderName.trim(), folderId);
      setNewFolderName("");
      setShowNewFolder(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la carpeta");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!renaming || !renameValue.trim()) return;
    try {
      if (renaming.type === "folder") {
        await api.renameFolder(renaming.id, renameValue.trim());
      } else {
        await api.renameFile(renaming.id, renameValue.trim());
      }
      setRenaming(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo renombrar");
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm("¿Eliminar esta carpeta y todo su contenido? Esta acción no se puede deshacer.")) return;
    try {
      await api.deleteFolder(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la carpeta");
    }
  }

  async function handleDeleteFile(id: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      await api.deleteFile(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el archivo");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-600">
        <button onClick={() => router.push("/drive")} className="hover:text-brand-600 hover:underline">
          Inicio
        </button>
        {breadcrumb.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            <button onClick={() => router.push(`/drive/${f.id}`)} className="hover:text-brand-600 hover:underline">
              {f.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{folder ? folder.name : "Mis archivos"}</h1>
        <Button onClick={() => setShowNewFolder(true)}>Nueva carpeta</Button>
      </div>

      <UploadDropzone folderId={folderId} onUploaded={load} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {folders.length === 0 && files.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">Esta carpeta está vacía.</p>
          )}

          {folders.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-4 py-3 hover:bg-gray-50"
            >
              <button
                onClick={() => router.push(`/drive/${f.id}`)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span aria-hidden>📁</span>
                <span className="font-medium text-gray-900">{f.name}</span>
              </button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRenaming({ type: "folder", id: f.id });
                    setRenameValue(f.name);
                  }}
                >
                  Renombrar
                </Button>
                <Button variant="danger" onClick={() => handleDeleteFolder(f.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}

          {files.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex flex-1 items-center gap-3">
                <span aria-hidden>{isPlayable(f.mime_type) ? "🎬" : "📄"}</span>
                <div>
                  <p className="font-medium text-gray-900">{f.original_name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(f.size_bytes)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isPlayable(f.mime_type) && (
                  <Button variant="secondary" onClick={() => setPlayingFile(f)}>
                    Reproducir
                  </Button>
                )}
                <a href={streamUrl(f.id)} download={f.original_name}>
                  <Button variant="secondary" type="button">
                    Descargar
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRenaming({ type: "file", id: f.id });
                    setRenameValue(f.original_name);
                  }}
                >
                  Renombrar
                </Button>
                <Button variant="danger" onClick={() => handleDeleteFile(f.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showNewFolder} onClose={() => setShowNewFolder(false)} title="Nueva carpeta">
        <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNewFolder(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Renombrar">
        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <Input
            label="Nuevo nombre"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!playingFile} onClose={() => setPlayingFile(null)} title={playingFile?.original_name} size="lg">
        {playingFile && <MediaPlayer file={playingFile} />}
      </Modal>
    </div>
  );
}
