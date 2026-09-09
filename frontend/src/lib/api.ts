import type { User, Folder, FileItem, Token } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "cloud_storage_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      // el cuerpo no era JSON, nos quedamos con statusText
    }
    throw new ApiError(res.status, detail || "Ha ocurrido un error");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---
export async function register(email: string, password: string, fullName?: string): Promise<User> {
  return request<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName || null }),
  });
}

export async function login(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new ApiError(res.status, "Email o contraseña incorrectos");
  }
  return res.json();
}

export async function getCurrentUser(): Promise<User> {
  return request<User>("/api/auth/me");
}

// --- Folders ---
export async function listFolders(parentId: string | null): Promise<Folder[]> {
  const q = parentId ? `?parent_id=${parentId}` : "";
  return request<Folder[]>(`/api/folders/${q}`);
}

export async function getFolder(id: string): Promise<Folder> {
  return request<Folder>(`/api/folders/${id}`);
}

export async function createFolder(name: string, parentId: string | null): Promise<Folder> {
  return request<Folder>("/api/folders/", {
    method: "POST",
    body: JSON.stringify({ name, parent_id: parentId }),
  });
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
  return request<Folder>(`/api/folders/${id}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function moveFolder(id: string, parentId: string | null): Promise<Folder> {
  return request<Folder>(`/api/folders/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ parent_id: parentId }),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  return request<void>(`/api/folders/${id}`, { method: "DELETE" });
}

// --- Files ---
export async function listFiles(folderId: string | null): Promise<FileItem[]> {
  const q = folderId ? `?folder_id=${folderId}` : "";
  return request<FileItem[]>(`/api/files/${q}`);
}

export async function renameFile(id: string, name: string): Promise<FileItem> {
  return request<FileItem>(`/api/files/${id}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function moveFile(id: string, folderId: string | null): Promise<FileItem> {
  return request<FileItem>(`/api/files/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ folder_id: folderId }),
  });
}

export async function deleteFile(id: string): Promise<void> {
  return request<void>(`/api/files/${id}`, { method: "DELETE" });
}

export function uploadFile(
  file: File,
  folderId: string | null,
  onProgress?: (pct: number) => void
): Promise<FileItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const q = folderId ? `?folder_id=${folderId}` : "";
    xhr.open("POST", `${API_URL}/api/files/upload${q}`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let detail = xhr.responseText;
        try {
          detail = JSON.parse(xhr.responseText).detail ?? detail;
        } catch {
          // ignore
        }
        reject(new ApiError(xhr.status, detail || "Error al subir el archivo"));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Error de red al subir el archivo"));

    const formData = new FormData();
    formData.append("upload_file", file);
    xhr.send(formData);
  });
}

export function streamUrl(fileId: string): string {
  const token = getToken();
  return `${API_URL}/api/stream/${fileId}?token=${encodeURIComponent(token ?? "")}`;
}
