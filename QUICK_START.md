# ⚡ ARRANQUE RÁPIDO - Imprenta El Gráfico

## 🚀 En 3 Pasos:

### 1. **Instalar Dependencias (Primera vez)**
```bash
cd C:\Users\gusta\Desktop\imprenta-app
npm install
```

### 2. **Iniciar Servidor**
```bash
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

### 3. **Acceder**

**Desde esta PC:**
- Abrir navegador
- Ir a: `http://localhost:3000`

**Desde otra PC en la red:**
1. Abrir Terminal/CMD en servidor y ver IP:
   ```bash
   ipconfig
   ```
   Anotar: `IPv4 Address` (ej: `192.168.1.100`)

2. Desde otra PC, ir a:
   ```
   http://192.168.1.100:3000
   ```

---

## 🔐 Login

- **Usuario:** `admin`
- **Contraseña:** (la que configuraste)

---

## 📌 Información Importante

### **IP del Servidor:**
```
Encontrar con: ipconfig
Buscar: IPv4 Address (ej: 192.168.1.100)
```

### **Puerto:**
```
3000 (debe permitirse en Firewall de Windows)
```

### **Base de Datos:**
```
SQLite3 - archivo: imprenta.db
Backup: backup_produccion.sql
```

### **Backup automático:**
```
Todos los datos se guardan automáticamente en imprenta.db
Copiar imprenta.db para hacer backup
```

---

## ⚙️ Firewall (Importante)

Si no se puede acceder desde otra PC:

1. Abrir: `Windows Defender Firewall`
2. `Permitir una aplicación a través del firewall`
3. Permitir `node.exe` en redes Privada y Pública
4. También permitir Puerto `3000`

---

## 🛑 Parar Servidor

Presionar en Terminal: `Ctrl + C`

---

## ❌ Errores Comunes

| Error | Solución |
|-------|----------|
| Puerto 3000 en uso | `taskkill /IM node.exe /F` |
| No accede desde otra PC | Verificar Firewall permitir puerto 3000 |
| Base de datos vacía | Ejecutar `node server.js` (recreará BD) |
| npm no encontrado | Instalar Node.js desde nodejs.org |

---

## 📞 Datos Empresa

```
Imprenta El Gráfico
El Gráfico de Orán - Salta
📱 3878 22-4908
```

---

**Para documentación completa, ver: `README_PRODUCCION.md`**

