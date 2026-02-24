# 📊 Imprenta El Gráfico - Servidor de Gestión

**Versión:** 2.0 - Producción
**Status:** ✅ Listo para usar

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### **Requisitos Previos:**

- Windows 10/11 Pro o similar
- Node.js v20.x o superior
- npm (incluido con Node.js)
- Acceso a red local (Ethernet o Wi-Fi)

---

## 📥 PASO 1: Instalar Node.js

1. **Descargar Node.js:**
   - Ir a: https://nodejs.org/
   - Descargar **LTS (Long Term Support)** v20.x o superior
   - Ejecutar instalador (`node-v20.x.x-x64.msi`)

2. **Verificar instalación:**
   ```bash
   node --version
   npm --version
   ```
   Deberían mostrar versiones (ej: v20.10.0)

---

## 📂 PASO 2: Preparar el Servidor

1. **Copiar carpeta `imprenta-app`:**
   - Ubicar: `C:\Users\<usuario>\Desktop\imprenta-app`
   - **Opción A (Servidor Dedicado):** Copiar a `C:\Servidor\imprenta-app`
   - **Opción B (En esta PC):** Usar ubicación actual

2. **Abrir Terminal en la carpeta:**
   ```bash
   cd C:\Users\gusta\Desktop\imprenta-app
   # o
   cd C:\Servidor\imprenta-app
   ```

3. **Instalar dependencias:**
   ```bash
   npm install
   ```
   (Descargará todas las librerías necesarias - demora ~5 minutos)

---

## 🔧 PASO 3: Configurar para Red

### **A. Encontrar IP del Servidor:**

```bash
# En CMD o PowerShell:
ipconfig
```

Buscar algo como:
```
IPv4 Address . . . . . . . . . . . . : 192.168.1.100
```

O en Terminal PowerShell:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Ethernet*" -or $_.InterfaceAlias -like "*WiFi*"} | Select IPAddress
```

**Nota:** IP típicas:
- `192.168.1.x` (router Movistar, Claro, etc.)
- `192.168.0.x` (router más antiguos)
- `10.0.0.x` (redes corporativas)

### **B. Configurar Firewall de Windows (IMPORTANTE):**

1. **Abrir Windows Defender Firewall:**
   - Ir a: `Configuración → Privacidad y seguridad → Firewall de Windows Defender`
   - Click en `Permitir una aplicación a través del firewall`

2. **Permitir Node.js:**
   - Click `Cambiar configuración`
   - Click `Permitir otra aplicación`
   - Buscar y agregar: `C:\Program Files\nodejs\node.exe`
   - Marcar `Privada` y `Pública`
   - Click Agregar

3. **Permitir Puerto 3000:**
   - Ir a: `Firewall → Configuración avanzada`
   - Click derecha en `Reglas de entrada → Nueva regla`
   - Seleccionar `Puerto → TCP → 3000`
   - Aceptar

### **C. Crear Script de Inicio (Opcional):**

Crear archivo `iniciar-servidor.bat`:

```batch
@echo off
cd /d C:\Users\gusta\Desktop\imprenta-app
echo ========================================
echo Iniciando Imprenta El Gráfico...
echo ========================================
node server.js
pause
```

Guardar en escritorio → Doble click para iniciar

---

## ▶️ PASO 4: Iniciar el Servidor

### **Opción A: Terminal/CMD**

```bash
cd C:\Users\gusta\Desktop\imprenta-app
npm start
```

O directamente:
```bash
node server.js
```

**Debería ver:**
```
✅ Base de datos lista.
✅ Servidor escuchando en puerto 3000
```

### **Opción B: PowerShell**

```powershell
cd "C:\Users\gusta\Desktop\imprenta-app"
node server.js
```

---

## 🌐 PASO 5: Acceder desde Otras Máquinas

### **En la Máquina Servidor:**
- Abrir navegador (Chrome, Firefox, Edge)
- Ir a: `http://localhost:3000`

### **En Otras Máquinas de la Red:**

1. **Averiguar IP del servidor** (desde terminal del servidor):
   ```bash
   ipconfig
   ```
   Anotar IPv4 Address (ej: `192.168.1.100`)

2. **Abrir navegador en otra PC:**
   - Ir a: `http://192.168.1.100:3000`
   - (Reemplazar `192.168.1.100` con IP real)

3. **Debería ver:**
   - Pantalla de login
   - Usuario: `admin`
   - Contraseña: (la que configuraste)

---

## 🔐 CREDENCIALES POR DEFECTO

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| admin | (configurable) | Admin | Todo |
| vendedor | (crear en sistema) | Vendedor | Ventas, Reportes, Caja |
| operador | (crear en sistema) | Operador | Pedidos, Catálogo |
| empleado | (crear en sistema) | Empleado | Pedidos, Presupuestos |

**Para cambiar contraseña admin:**
- Ir a `/usuarios`
- Crear nuevo usuario admin o cambiar rol

---

## 📊 FUNCIONALIDADES PRINCIPALES

✅ **Gestión de Clientes:** Crear, editar, historial
✅ **Catálogo:** 72 productos con precios actualizados
✅ **Pedidos:** Crear, cambiar estado, pagos
✅ **Presupuestos:** Con aceptación y conversión a pedido
✅ **Caja Diaria:** Ingresos/egresos, métodos de pago
✅ **Reportes:** Diarios, mensuales, por clientes
✅ **Comprobante A5:** Imprenta El Gráfico con membrete
✅ **Exportar PDF:** Cajas, reportes, pedidos
✅ **Control de Usuarios:** Admin, Vendedor, Operador, Empleado
✅ **WhatsApp Integrado:** Notificaciones a clientes

---

## 🛠️ TROUBLESHOOTING

### **Error: "Puerto 3000 ya en uso"**

```bash
# Encontrar proceso en puerto 3000
netstat -ano | findstr :3000

# Matar proceso (cambiar PID)
taskkill /PID 12345 /F
```

### **Error: "No puedo acceder desde otra PC"**

1. Verificar que servidor tiene Node running:
   ```bash
   node server.js
   ```

2. Verificar IP correcta:
   ```bash
   ipconfig
   ```

3. Verificar firewall permite puerto 3000:
   - Ir a Windows Defender Firewall
   - Verificar regla en "Reglas de entrada"

4. Verificar conectividad:
   ```bash
   ping 192.168.1.100  # Desde otra PC
   ```

### **Base de datos corrupta o vacía**

1. Restaurar desde backup:
   ```bash
   # Copiar backup_produccion.sql a carpeta raíz
   # Ejecutar script de restauración
   ```

2. O resetear:
   ```bash
   # Eliminar imprenta.db
   # Reiniciar servidor (recreará BD vacía)
   ```

---

## 🔄 PARAR EL SERVIDOR

- **Terminal:** Presionar `Ctrl + C`
- **PowerShell:** Presionar `Ctrl + C`
- **Batch file:** Cerrar ventana

---

## 📦 BACKUP Y RESTAURACIÓN

### **Hacer Backup:**

1. Copiar archivos:
   - `imprenta.db` (base de datos)
   - Carpeta `public/uploads` (imágenes)

2. O usar backup SQL:
   - `backup_produccion.sql` (exportación completa)

### **Restaurar Backup:**

1. Cerrar servidor
2. Reemplazar `imprenta.db`
3. Reiniciar servidor

---

## 🚀 ARRANQUE AUTOMÁTICO (Windows)

### **Opción 1: Tarea Programada de Windows**

1. Abrir: `Programador de tareas`
2. Click derecha en `Biblioteca de Programador de tareas → Nueva carpeta`
3. Crear carpeta `Imprenta`
4. Click derecha → `Crear tarea básica`
5. Nombre: `Iniciar Servidor Imprenta`
6. Trigger: `Al iniciar el equipo`
7. Acción: `Iniciar programa`
   - Programa: `C:\Program Files\nodejs\node.exe`
   - Argumentos: `C:\Users\gusta\Desktop\imprenta-app\server.js`
8. Aceptar

### **Opción 2: Script de Inicio Rápido**

Crear `iniciar-servidor.cmd`:

```batch
@echo off
title Imprenta El Gráfico - Servidor
cd /d C:\Users\gusta\Desktop\imprenta-app
node server.js
pause
```

---

## 📞 DATOS DE CONTACTO EMPRESA

```
Imprenta El Gráfico
📍 El Gráfico de Orán - Salta
📱 3878 22-4908
```

---

## 📝 VERSIÓN ACTUAL

- **Versión:** 2.0
- **Fecha:** Febrero 2026
- **Estado:** ✅ Producción
- **Usuarios Concurrentes Recomendados:** 5-10
- **Navegadores Soportados:** Chrome, Firefox, Edge, Safari

---

## 📚 ARCHIVOS IMPORTANTES

```
imprenta-app/
├── server.js                    # Archivo principal
├── config/                      # Configuración
├── routes/                      # API routes
├── controllers/                 # Lógica de negocio
├── views/                       # Plantillas HTML/EJS
├── public/                      # CSS, JS, imágenes
├── imprenta.db                  # Base de datos SQLite
├── backup_produccion.sql        # Backup SQL
├── package.json                 # Dependencias
└── README_PRODUCCION.md         # Este archivo
```

---

## ✅ CHECKLIST PRE-PRODUCCIÓN

- [ ] Node.js instalado (v20+)
- [ ] npm install ejecutado
- [ ] Firewall configurado (puerto 3000)
- [ ] IP del servidor anotada
- [ ] Servidor iniciado sin errores
- [ ] Acceso desde localhost:3000 funcionando
- [ ] Acceso desde otra PC funcionando
- [ ] Usuarios creados (admin, vendedor, operador, empleado)
- [ ] Backup creado
- [ ] Pruebas básicas completadas

---

## 🎯 PRÓXIMOS PASOS

1. **Probar desde diferentes dispositivos:**
   - Desktop, Tablet, Smartphone
   - Verificar responsive design

2. **Crear usuarios para equipo:**
   - `/usuarios` → Crear cuentas para vendedores, operadores

3. **Cargar datos iniciales:**
   - Clientes
   - Productos (ya están cargados)
   - Presupuestos/Pedidos de prueba

4. **Configurar impresoras:**
   - Probar impresión de comprobantes A5
   - Probar exportar PDF

5. **Implementar mejoras futuras:**
   - Mercado Pago + QR
   - Dashboard con gráficos
   - WhatsApp Business API
   - Sistema de alertas

---

**¡Sistema listo para usar en producción!** 🎉

Para soporte o preguntas, revisar archivos de documentación en la carpeta raíz.

