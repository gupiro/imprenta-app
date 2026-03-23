# ✅ Checklist para Despliegue en Render

## ⚙️ ANTES DE DEPLOYAR

### En tu PC (5 minutos)

```bash
# 1. Verificar que todo está listo
npm run prepare-render
# Deberías ver: ✅ 6/6 verificaciones pasadas

# 2. Push a GitHub
git push origin main
# Espera confirmación: [main ...] 

# 3. (Opcional) Si tienes datos existentes:
node export-datos.js
git add imprenta.db
git commit -m "backup: BD actualizada"
git push origin main
```

---

## 🌐 EN RENDER DASHBOARD

### Paso 1: Crear Web Service (2 minutos)

- [ ] Ir a https://dashboard.render.com
- [ ] Click **"New +"**
- [ ] Click **"Web Service"**
- [ ] Seleccionar GitHub: **gupiro/imprenta-app**
- [ ] Click **"Connect"**

### Paso 2: Configurar Información Básica (1 minuto)

- [ ] **Name:** `imprenta-app`
- [ ] **Environment:** `Node`
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `node server.js`
- [ ] **Plan:** `Free` (o Starter si necesitas)

### Paso 3: Configurar Persistent Disk (2 minutos)

⚠️ **IMPORTANTE para que los datos persistan**

- [ ] Click **"Add Persistent Disk"**
  - [ ] **Mount Path:** `/opt/render/project/src`
  - [ ] **Size:** `1 GB`
- [ ] Click **"Save"**

### Paso 4: Agregar Environment Variables (5 minutos)

En sección **"Environment"**, agregar cada una:

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`
- [ ] `SESSION_SECRET` = (generar con comando de abajo)
- [ ] `DATABASE_URL` = `/opt/render/project/src/imprenta.db`
- [ ] `ANTHROPIC_API_KEY` = (tu API key, opcional)

**Para generar SESSION_SECRET seguro:**

En tu terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar el resultado y pegarlo como `SESSION_SECRET` en Render.

### Paso 5: Crear Servicio (5 minutos)

- [ ] Click **"Create Web Service"**
- [ ] **Esperar** a que aparezca: ✅ **"Your service is live"**
- [ ] Anotar la URL: `https://imprenta-app-xxxxx.onrender.com`

---

## ✅ VERIFICACIÓN (5 minutos)

### Paso 1: Revisar Logs

- [ ] En Render Dashboard → Tu servicio → **"Logs"**
- [ ] Buscar:
  ```
  ✅ Base de datos lista
  ✅ Server corriendo en http://localhost:3000
  ```

❌ Si ves errores, ir a sección "⚠️ Problemas" abajo.

### Paso 2: Acceder a la Aplicación

- [ ] Abre tu navegador: `https://imprenta-app-xxxxx.onrender.com`
- [ ] Deberías ver la página de login

### Paso 3: Probar Funcionalidades

Credenciales: **admin** / **admin123**

- [ ] ✅ **Login** funciona
- [ ] ✅ Ir a **Pedidos** y crear uno
- [ ] ✅ Ir a **Caja Diaria** y registrar movimiento
- [ ] ✅ Ir a **Reportes** y generar PDF
- [ ] ✅ (Opcional) **IA Análisis** funciona (si configuraste API)

---

## 📊 CARGAR DATOS (Solo si tienes BD existente)

### Opción A: Datos Existentes

Si ya corriste `node export-datos.js` antes de push:
- ✅ Los datos se cargan automáticamente en el primer deploy
- Accede con tus credenciales habituales

### Opción B: Empezar Vacío

- ✅ Crea usuario admin en la interfaz
- ✅ Carga datos manualmente desde la UI

---

## 🔄 ACTUALIZACIONES FUTURAS

Cada vez que hagas cambios:

```bash
# 1. Cambios en tu código
# ...editas archivos...

# 2. Commit y push
git add .
git commit -m "descripción del cambio"
git push origin main

# 3. Render redeploya automáticamente ✅
# (Verifica en Dashboard → Deploys)
```

---

## ⚠️ PROBLEMAS COMUNES & SOLUCIONES

### Error: "ReferenceError: DATABASE_URL is undefined"

**Solución:**
1. Dashboard → Servicio → **"Environment"**
2. Verificar `DATABASE_URL=/opt/render/project/src/imprenta.db`
3. Si falta, agregarlo
4. Click **"Redeploy"** en Deploys

### Error: "Cannot find module: sqlite"

**Solución:**
1. Dashboard → Deploys → Último → **"Redeploy"**
2. Esperar a que termine
3. Revisar Logs para confirmar

### Error: "Persistent Disk not mounted"

**Solución:**
1. Dashboard → Servicio → Tab "Disk"
2. Verificar Mount Path: `/opt/render/project/src`
3. Si falta, agregar nuevo Persistent Disk
4. Redeploy

### BD está vacía / perdió datos

**Causas:**
- Persistent Disk no configurado (↑)
- Cambió la BD en localhost pero no se subió

**Solución:**
```bash
node export-datos.js
git add imprenta.db
git push origin main
# Esperar redeploy automático
```

### Servicio se apaga solo (plan Free)

**Comportamiento normal:**
- Plan Free se apaga después de 15 minutos sin uso
- Se reactiva cuando accedes

**Solución:**
- Actualizar a plan **Starter** ($7/mes) para siempre activo

---

## 🛡️ SEGURIDAD - CHECKLIST

- [ ] `.env` NO está commiteado (revisar .gitignore)
- [ ] `SESSION_SECRET` es único y aleatorio (32+ chars)
- [ ] `ANTHROPIC_API_KEY` NO está en código
- [ ] All secrets están en Render Environment, no en archivos
- [ ] `.env.example` tiene solo placeholders, sin valores reales

---

## 📈 DESPUÉS DEL DESPLIEGUE

### Opcional: Cambiar Plan

Si el plan Free te queda corto:

1. Dashboard → Servicio → **"Settings"**
2. Click **"Upgrade to Starter"** ($7/mes)
   - Servicio siempre activo (no se apaga)
   - Mejor performance

### Opcional: Agregar Dominio Personalizado

1. Dashboard → Servicio → **"Settings"**
2. Agregar Custom Domain: `imprenta.miempresa.com`
3. Apuntar DNS a Render

### Opcional: Configurar Backups Automáticos

Ver sección "Cron jobs" en `render.yaml` para backups programados.

---

## 📚 DOCUMENTACIÓN

- **QUICK_RENDER_SETUP.md** - Resumen rápido
- **RENDER_DEPLOYMENT.md** - Guía completa con más detalles
- **render.yaml** - Configuración técnica IaC

---

## ✨ Resumen

| Fase | Tiempo | Estado |
|------|--------|--------|
| Setup local | 5 min | ⏳ |
| En Render | 15 min | ⏳ |
| Verificación | 5 min | ⏳ |
| **Total** | **~25 min** | ⏳ |

---

**¿Algo no funciona?**

1. Revisar Logs en Render Dashboard
2. Buscar el error en sección "⚠️ Problemas"
3. Si persiste, revisar RENDER_DEPLOYMENT.md

**¡Suerte! 🚀**
