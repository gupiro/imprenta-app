# 🚀 Despliegue en Render - Guía Completa

## Descripción General

Esta guía te ayudará a desplegar **Imprenta El Gráfico** en Render.com con persistencia de datos SQLite.

### ✅ Requisitos Previos

- Cuenta en [Render.com](https://render.com) (gratis)
- Repositorio en GitHub con este código
- API key de Anthropic (opcional, para IA)

---

## 📋 Paso 1: Preparar Repositorio

### 1.1 Limpiar Secretos (CRÍTICO)

Nunca subas secretos a GitHub. Verifica que NO incluyas:

```bash
grep -r "sk-ant-" .
grep -r "SESSION_SECRET=" .env
```

Elimina cualquier línea con secretos reales en `.env`.

### 1.2 Archivos Necesarios

Los archivos ya están listos:
- ✅ `render.yaml` - Configuración de Render
- ✅ `.env.example` - Template de variables
- ✅ `.gitignore` - Verifica que excluya `.env`

### 1.3 Hacer Commit

```bash
git add render.yaml .env.example config/db.js
git commit -m "feat: Configuración para Render"
git push origin main
```

---

## 🌐 Paso 2: Crear Servicio en Render

1. Abre https://dashboard.render.com
2. **"New +"** → **"Web Service"**
3. Conectar GitHub repo `imprenta-app`

**Configuración:**
- Name: `imprenta-app`
- Environment: `Node`
- Build: `npm install`
- Start: `node server.js`
- Plan: Free

**Persistent Disk (IMPORTANTE):**
- Click "Add Persistent Disk"
- Mount Path: `/opt/render/project/src`
- Size: 1 GB

**Variables de Entorno:**
```
NODE_ENV=production
PORT=3000
SESSION_SECRET=<GENERAR CON: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
DATABASE_URL=/opt/render/project/src/imprenta.db
ANTHROPIC_API_KEY=<tu_clave_opcional>
```

Click **"Create Web Service"** y esperar a que diga ✅ "live"

---

## 📊 Paso 3: Cargar Base de Datos

### Si tienes datos existentes:

```bash
node export-datos.js
git add imprenta.db
git commit -m "backup: BD actualizada"
git push
# Render redeploya automáticamente
```

### Si es primera vez:

- Accede a `https://tu-servicio.onrender.com`
- Se crea BD vacía automáticamente
- Login: admin / admin123
- Cargar datos manualmente

---

## ✅ Verificación

En Render Dashboard → Logs, buscar:
```
✅ Base de datos lista
✅ Server corriendo
```

Prueba:
- ✅ Login funciona
- ✅ Crear pedidos
- ✅ Reportes PDF
- ✅ IA análisis (si configuraste)

---

## ⚠️ Problemas Comunes

| Problema | Solución |
|----------|----------|
| "DATABASE_URL not found" | Redeploy en Render |
| "SESSION_SECRET undefined" | Agregar en Environment |
| BD vacía en nuevo deploy | Normal - crear datos manualmente |
| "Cannot find Puppeteer" | `npm install puppeteer && git push` |
| BD "se reinicia" | Verificar Persistent Disk configurado |

---

## 🔄 Actualizaciones Futuras

```bash
# Hacer cambios
git add .
git commit -m "cambio importante"
git push origin main
# Render redeploya automáticamente ✅
```

---

## 🛡️ Seguridad

- ✅ `.env` NUNCA en GitHub
- ✅ SESSION_SECRET: aleatorio, 32+ chars
- ✅ API keys SOLO en Render Environment
- ✅ HTTPS automático (Render)
- ✅ Backups regulares de BD

---

**Última actualización:** Marzo 2026
