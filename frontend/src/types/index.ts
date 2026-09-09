export interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: string;
}

export interface FileItem {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  folder_id: string | null;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}
