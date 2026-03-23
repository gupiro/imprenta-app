# ⚡ Guía Rápida: Despliegue en Render

## En Tu Computadora (5 minutos)

### 1️⃣ Verificar Configuración

```bash
npm run prepare-render
```

Deberías ver:
```
✅ 6/6 verificaciones pasadas
✅ ¡Listo para desplegar en Render!
```

### 2️⃣ Subir a GitHub

```bash
git push origin main
```

---

## En Render (10 minutos)

### 3️⃣ Crear Web Service

1. Abre https://dashboard.render.com
2. **"New +"** → **"Web Service"**
3. Conectar GitHub: **gupiro/imprenta-app**

### 4️⃣ Configurar Servicio

**Información Basic:**
- Name: `imprenta-app`
- Environment: `Node`
- Build: `npm install`
- Start: `node server.js`
- Plan: **Free** (o Starter si quieres)

**Click "Add Persistent Disk":**
- Mount Path: `/opt/render/project/src`
- Size: 1 GB

### 5️⃣ Environment Variables

En sección "Environment", agregar cada una:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SESSION_SECRET` | Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | `/opt/render/project/src/imprenta.db` |
| `ANTHROPIC_API_KEY` | Tu API key de https://console.anthropic.com/account/keys (opcional) |

### 6️⃣ Create Service

Click **"Create Web Service"** y esperar a que diga:
```
✅ Your service is live at: https://imprenta-app-xxxxx.onrender.com
```

---

## Cargar Datos (5 minutos)

### Opción A: Con datos existentes

```bash
node export-datos.js
git add imprenta.db
git commit -m "backup: BD actualizada"
git push origin main
# Render redeploya automáticamente
```

### Opción B: Empezar vacío

- Accede a `https://tu-servicio.onrender.com`
- Login: **admin** / **admin123**
- Cargar datos manualmente desde la interfaz

---

## ✅ Verificar Que Funcione

En la consola de Render (Dashboard → Servicio → Logs):

```
✅ Base de datos lista
✅ Server corriendo en http://localhost:3000
```

Luego entra a tu URL y prueba:
- ✅ Login
- ✅ Crear pedido
- ✅ Caja diaria
- ✅ Reportes PDF
- ✅ IA análisis (si configuraste API)

---

## 🔄 Futuros Cambios

```bash
# Hacer cambios en tu código
# Commit y push:
git add .
git commit -m "tu mensaje"
git push origin main

# Render redeploya automáticamente ✅
# Revisa el log en Dashboard
```

---

## ⚠️ Si Algo Falla

1. **Revisa Logs:** Dashboard → Servicio → **"Logs"**
2. **Verifica variables:** Dashboard → Servicio → **"Environment"**
3. **Persistent Disk:** Dashboard → Servicio → Confirma que esté **mounted**
4. **Redeploy:** Dashboard → Deploys → Click en último → **"Redeploy"**

---

## 📚 Más Info

- Ver: **RENDER_DEPLOYMENT.md** (guía completa con troubleshooting)
- Docs Render: https://render.com/docs
- Status: https://status.render.com

---

**¿Necesitas ayuda?** Revisa los logs en Render dashboard → Servicio → Logs
