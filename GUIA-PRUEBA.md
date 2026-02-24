# 🚀 Guía para Probar el Programa

## Paso 1: Instalar Dependencias

Abre PowerShell o CMD en la carpeta del proyecto y ejecuta:

```bash
cd c:\Users\gusta\Desktop\imprenta-app
npm install
```

## Paso 2: Crear Usuario Admin (si no existe)

Ejecuta este comando para crear el usuario admin inicial:

```bash
node crearUsuarioAdmin.js
```

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

⚠️ **IMPORTANTE:** Cambiá la contraseña después del primer login.

## Paso 3: Iniciar el Servidor

Ejecuta:

```bash
npm start
```

O directamente:

```bash
node server.js
```

Deberías ver un mensaje como:
```
✅ Base de datos lista.
✅ Server corriendo en http://localhost:3000
```

## Paso 4: Abrir en el Navegador

Abre tu navegador y ve a:
```
http://localhost:3000
```

## Paso 5: Login

Ingresá con:
- **Usuario:** `admin`
- **Contraseña:** `admin123`

## Paso 6: Probar Funcionalidades

### ✅ Crear un Cliente Nuevo
1. Click en "Clientes" en el navbar
2. Click en "Nuevo Cliente"
3. Completá nombre y teléfono (obligatorios)
4. Guardá

### ✅ Crear un Pedido
1. Click en "Pedidos" → "Nuevo Pedido" (o desde el dashboard)
2. Escribí el nombre del cliente (o seleccioná uno existente)
3. Agregá productos:
   - **Del Catálogo:** Seleccioná del dropdown y se agrega automáticamente
   - **Manual:** Click en "➕ Manual" y completá descripción y precio
4. Ingresá seña (opcional)
5. Seleccioná medio de pago y fecha de entrega
6. Click en "💾 Crear Pedido"

### ✅ Ver Pedidos por Estado
1. Click en "Pedidos" en el navbar
2. Verás pestañas: PENDIENTE, EN_PRODUCCION, LISTO, ENTREGADO
3. Click en cada pestaña para filtrar

### ✅ Avanzar Estado de un Pedido
1. En la lista de pedidos, click en "▶ Avanzar Estado"
2. El pedido pasará al siguiente estado automáticamente

### ✅ Ver Deuda de Clientes
1. Click en "Clientes"
2. Verás una columna "Deuda Total" con el monto adeudado
3. Los clientes con deuda aparecen resaltados en amarillo

### ✅ Crear Otros Usuarios
1. Click en "Usuarios" (solo Admin puede ver esto)
2. Click en "Nuevo Usuario"
3. Seleccioná el rol:
   - **Admin:** Acceso total
   - **Vendedor:** Puede crear pedidos y clientes
   - **Operador:** Solo puede cambiar estados de pedidos

## 🔧 Solución de Problemas

### Error: "Cannot find module"
Ejecutá: `npm install`

### Error: "Port 3000 already in use"
Cambiá el puerto en `server.js` o cerrá el programa que usa el puerto 3000

### Error: "Base de datos no encontrada"
El programa crea la base de datos automáticamente. Si hay problemas, ejecutá:
```bash
node resetDb.js
```

### No puedo hacer login
Verificá que el usuario exista ejecutando:
```bash
node crearUsuarioAdmin.js
```

## 📝 Notas Importantes

- La base de datos se crea automáticamente en `imprenta.db`
- Los roles antiguos se migran automáticamente al iniciar
- Las columnas nuevas (senia, saldo) se agregan automáticamente
- El programa usa SQLite, no necesitás instalar MySQL o PostgreSQL

## 🎯 Próximos Pasos

Una vez que probaste todo:
1. Creá usuarios para cada rol (vendedor, operador)
2. Probá los permisos de cada rol
3. Creá pedidos de prueba
4. Verificá que los módulos de Proveedores, Stock y Gastos funcionen
