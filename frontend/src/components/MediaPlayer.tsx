"use client";

import type { FileItem } from "@/types";
import { streamUrl } from "@/lib/api";

interface MediaPlayerProps {
  file: FileItem;
}

export function MediaPlayer({ file }: MediaPlayerProps) {
  const src = streamUrl(file.id);

  if (file.mime_type.startsWith("audio/")) {
    return (
      <audio controls autoPlay className="w-full" src={src}>
        Tu navegador no soporta reproducción de audio.
      </audio>
    );
  }

  return (
    <video controls autoPlay className="max-h-[70vh] w-full rounded-md bg-black" src={src}>
      Tu navegador no soporta reproducción de vídeo.
    </video>
  );
}
