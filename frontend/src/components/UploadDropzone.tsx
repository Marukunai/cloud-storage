"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useUpload } from "@/hooks/useUpload";

interface UploadDropzoneProps {
  folderId: string | null;
  onUploaded: () => void;
}

export function UploadDropzone({ folderId, onUploaded }: UploadDropzoneProps) {
  const { tasks, upload, dismiss } = useUpload(folderId, onUploaded);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  }

  function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) upload(e.target.files);
    e.target.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed
          px-6 py-8 text-center transition-colors
          ${dragging ? "border-brand-500 bg-brand-50" : "border-gray-300 bg-white hover:border-gray-400"}`}
      >
        <p className="text-sm text-gray-600">
          Arrastra archivos aquí, o <span className="font-medium text-brand-600">haz clic para elegir</span>
        </p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleSelect} />
      </div>

      {tasks.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm">
              <span className="flex-1 truncate">{t.file.name}</span>
              {t.status === "uploading" && (
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-brand-600 transition-all" style={{ width: `${t.progress}%` }} />
                </div>
              )}
              {t.status === "done" && <span className="text-green-600">✓</span>}
              {t.status === "error" && <span className="text-red-600">{t.error}</span>}
              {(t.status === "done" || t.status === "error") && (
                <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
