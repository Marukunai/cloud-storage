#!/bin/bash
set -e

echo "📁 Creando estructura de carpetas..."

# Backend
mkdir -p backend/app/core
mkdir -p backend/app/models
mkdir -p backend/app/schemas
mkdir -p backend/app/api/routes
mkdir -p backend/app/services
mkdir -p backend/app/tests
mkdir -p backend/alembic/versions

# Frontend
mkdir -p frontend/src/app/drive/\[folderId\]
mkdir -p frontend/src/components/FileExplorer
mkdir -p frontend/src/components/ui
mkdir -p frontend/src/hooks
mkdir -p frontend/src/lib
mkdir -p frontend/src/types
mkdir -p frontend/public

# Storage y nginx
mkdir -p storage
mkdir -p nginx-proxy

echo "📄 Creando archivos base..."

# Root
touch docker-compose.yml
touch docker-compose.override.yml
touch .env.example
touch .gitignore
touch README.md

# Backend
touch backend/Dockerfile
touch backend/requirements.txt
touch backend/alembic.ini
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/core/__init__.py
touch backend/app/core/config.py
touch backend/app/core/security.py
touch backend/app/core/database.py
touch backend/app/models/__init__.py
touch backend/app/models/user.py
touch backend/app/models/folder.py
touch backend/app/models/file.py
touch backend/app/schemas/__init__.py
touch backend/app/schemas/user.py
touch backend/app/schemas/folder.py
touch backend/app/schemas/file.py
touch backend/app/api/__init__.py
touch backend/app/api/deps.py
touch backend/app/api/routes/__init__.py
touch backend/app/api/routes/auth.py
touch backend/app/api/routes/folders.py
touch backend/app/api/routes/files.py
touch backend/app/api/routes/stream.py
touch backend/app/services/__init__.py
touch backend/app/services/storage_service.py
touch backend/app/services/auth_service.py
touch backend/app/tests/__init__.py

# Frontend
touch frontend/Dockerfile
touch frontend/package.json
touch frontend/next.config.js
touch frontend/tailwind.config.js
touch frontend/src/app/layout.tsx
touch frontend/src/app/page.tsx
touch "frontend/src/app/drive/[folderId]/page.tsx"
touch frontend/src/components/UploadDropzone.tsx
touch frontend/src/components/MediaPlayer.tsx
touch frontend/src/hooks/useUpload.ts
touch frontend/src/hooks/useAuth.ts
touch frontend/src/lib/api.ts

# Storage placeholder (para que git trackee la carpeta vacía)
touch storage/.gitkeep

echo "✅ Estructura creada correctamente."
echo ""
echo "📂 Árbol generado:"
find . -not -path './.git*' -print | sed -e 's;[^/]*/;  ;g;s;  \([^ ]\); \1;'