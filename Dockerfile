# ==============================================================================
# WORKLOG PRO - DOCKERFILE MULTI-STAGE OPTIMIZADO
# ==============================================================================
# 1. Builder: Compila el frontend Vite y valida TypeScript
# 2. Runner: Imagen de producción mínima basada en Node Alpine (ligera y segura)
# ==============================================================================

# --- ETAPA 1: BUILDER ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias primero para aprovechar la caché de capas Docker
COPY package*.json ./

# Instalar todas las dependencias necesarias para la compilación
RUN npm ci

# Copiar archivos de configuración y código fuente
COPY tsconfig.json vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY public ./public
COPY src ./src
COPY server ./server
COPY types ./types

# Compilar frontend (genera el directorio estático /app/dist)
RUN npm run build

# --- ETAPA 2: RUNNER (PRODUCCIÓN) ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copiar manifiestos para dependencias de producción
COPY package*.json ./

# Instalar únicamente dependencias de producción + tsx para ejecutar el servidor
RUN npm ci --omit=dev && \
  npm install --no-save tsx && \
  npm cache clean --force

# Copiar el frontend compilado desde la etapa builder
COPY --from=builder /app/dist ./dist

# Copiar el backend y tipos
COPY server ./server
COPY types ./types

# Crear carpeta de copias de seguridad con permisos para el usuario 'node'
RUN mkdir -p /app/copy && \
  chown -R node:node /app

# Usar usuario sin privilegios por seguridad
USER node

# Exponer el puerto de la aplicación (3001)
EXPOSE 3001

# Verificación de salud (Healthcheck) usando wget nativo de Alpine
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/mysql/status || exit 1

# Iniciar servidor backend Express (que sirve la API y la SPA frontend)
CMD ["npm", "run", "start"]
