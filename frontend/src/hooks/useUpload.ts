"use client";

import { useState, useCallback } from "react";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { FileItem } from "@/types";

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

export function useUpload(folderId: string | null, onUploaded?: (file: FileItem) => void) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const upload = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach((file) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        setTasks((prev) => [...prev, { id, file, progress: 0, status: "uploading" }]);

        api
          .uploadFile(file, folderId, (pct) => {
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress: pct } : t)));
          })
          .then((uploaded) => {
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done", progress: 100 } : t)));
            onUploaded?.(uploaded);
          })
          .catch((err) => {
            const message = err instanceof ApiError ? err.message : "Error al subir el archivo";
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: message } : t)));
          });
      });
    },
    [folderId, onUploaded]
  );

  const dismiss = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tasks, upload, dismiss };
}
