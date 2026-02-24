# 📊 GUÍA: Actualizar Códigos de Productos Correlativs y Precios

## 🎯 OBJETIVO

Actualizar los 72 códigos de productos de forma correlativa (001 a 072) y revisar/actualizar precios reales para Orán, Salta.

---

## 1️⃣ ACTUALIZAR CÓDIGOS CORRELATIVOS

### Formato Requerido: `NNN-X`
- `NNN` = Número correlativo de 001 a 072
- `X` = Letra que indica el grupo del producto

### Grupos de Productos y Letras

```
T = TALONARIOS (11 productos)
  001-T a 011-T

E = ENTRADAS (6 productos)
  012-E a 017-E

B = BONO CONTRIBUCIÓN (2 productos)
  018-B a 019-B

I = IMPRESIÓN COLOR (6 productos)
  020-I a 025-I

F = FOTOGRÁFICO/FOTOCOPIAS (6 productos)
  026-F a 031-F

J = TARJETAS (5 productos)
  032-J a 036-J

L = LONA/BANNER/VINILO (6 productos)
  037-L a 042-L

S = SELLOS/DISTINTIVOS (4 productos)
  043-S a 046-S

D = 3D/SUBLIMADO (3 productos)
  047-D a 049-D

A = ACCESORIOS Y SERVICIOS (varios)
  050-A a 066-A

R = RESMAS Y PAPELES (6 productos)
  067-R a 072-R
```

### Cómo Actualizar

**Opción A: Mediante SQL (rápido)**
```sql
-- Ejecutar en la terminal SQLite o phpmyadmin

UPDATE catalogo_productos SET codigo = '001-T' WHERE nombre LIKE 'Talonario 1/2 Oficio x Duplicado%';
UPDATE catalogo_productos SET codigo = '002-T' WHERE nombre LIKE 'Talonario 1/2 Oficio x Triplicado%';
UPDATE catalogo_productos SET codigo = '003-T' WHERE nombre LIKE 'Talonario A4 Duplicado%';
-- ... etc para todos los 72
```

**Opción B: Mediante la Aplicación**
1. Ir a `/catalogo`
2. Click en editar cada producto
3. Cambiar código a formato `NNN-X`
4. Guardar

**Recomendado:** Opción A (SQL) es más rápida para 72 productos

---

## 2️⃣ ACTUALIZAR PRECIOS

### Precios Reales para Orán, Salta

**Criterios:**
- ✅ Precios de MERCADO REAL en Orán
- ✅ NI BARATOS (para ganar bien)
- ✅ NI CAROS (para ser competitivo)
- ✅ Actualizar según fecha del día

### Productos a Revisar

#### TALONARIOS (011)
- Talonarios 1/2: $5000-$8000
- Talonarios A4: $10000-$15000
- Talonarios Oficio: $12000-$25000
- Con Logo Color: $6000-$15000

**Precios sugeridos:**
```
001-T: Talonario 1/2 Oficio x Duplicado - $6500
002-T: Talonario 1/2 Oficio x Triplicado - $7500
003-T: Talonario A4 Duplicado - $12000
004-T: Talonario A4 x Triplicado - $17000
005-T: Talonario 1/2 - $5000
006-T: Talonario 1/3 - $4000
007-T: Talonario Oficio x Duplicado - $12000
008-T: Talonario Oficio x Triplicado - $20000
009-T: Talonario Oficio x Cuádruple - $24000
010-T: A4 Logo Color - $10000
011-T: 1/2 Oficio Logo Color - $6000
```

#### ENTRADAS (6)
- Entradas simples: $12000-$25000
- Entradas con color: $6000-$8000

#### IMPRESIÓN (6)
- Impresión por hoja: $150-$500
- A4 Color: $300-$500
- A3 Color: $800-$1500
- Cartulina: $1000-$3000

#### LONA (6)
- Lona: $400-$700 por m²
- Vinilo: $10000-$20000

#### SERVICIOS VARIOS
- Sublimado: $1500-$8000
- Estampado: $1000-$3000
- Servicios especiales: $2000-$30000

### Consultas Recomendadas

**Para revisar precios actuales:**
1. Comparar con imprentas locales de Orán/Salta
2. Revisar competencia directa
3. Ajustar según costo de producción
4. Agregar margen de ganancia (30-50%)

### Cómo Actualizar Precios

**Opción A: Mediante SQL**
```sql
-- Ejemplo para un producto
UPDATE catalogo_productos
SET precio_base = 7500
WHERE codigo = '002-T';

-- Actualizar varios
UPDATE catalogo_productos
SET precio_base = 15000
WHERE codigo LIKE '%T' AND codigo < '007-T';
```

**Opción B: Mediante la Aplicación**
1. Ir a `/catalogo`
2. Click en editar
3. Cambiar "Precio Base"
4. Guardar

---

## 📋 CHECKLIST DE ACTUALIZACIÓN

- [ ] Actualizar código 001-T a 011-T (TALONARIOS)
- [ ] Actualizar código 012-E a 017-E (ENTRADAS)
- [ ] Actualizar código 018-B a 019-B (BONO)
- [ ] Actualizar código 020-I a 025-I (IMPRESIÓN)
- [ ] Actualizar código 026-F a 031-F (FOTOGRÁFICO)
- [ ] Actualizar código 032-J a 036-J (TARJETAS)
- [ ] Actualizar código 037-L a 042-L (LONA)
- [ ] Actualizar código 043-S a 046-S (SELLOS)
- [ ] Actualizar código 047-D a 049-D (3D)
- [ ] Actualizar código 050-A a 066-A (ACCESORIOS)
- [ ] Actualizar código 067-R a 072-R (RESMAS)

- [ ] Revisar precios TALONARIOS
- [ ] Revisar precios ENTRADAS
- [ ] Revisar precios IMPRESIÓN
- [ ] Revisar precios LONA
- [ ] Revisar precios SERVICIOS
- [ ] Revisar precios RESMAS

---

## ⚠️ IMPORTANTE

### Antes de Actualizar
1. **Hacer copia de seguridad** de la base de datos:
   ```bash
   cp imprenta.db imprenta.db.backup
   ```

2. **Verificar datos actuales:**
   ```sql
   SELECT codigo, nombre, precio_base FROM catalogo_productos ORDER BY id;
   ```

### Después de Actualizar
1. Reiniciar el servidor
2. Ir a `/catalogo`
3. Verificar que los códigos aparezcan correctamente
4. Probar autocomplete (buscar por nuevo código)
5. Crear un pedido de prueba

---

## 💡 RECOMENDACIONES

### Para Códigos
- ✅ Usar SQL (más rápido para 72 productos)
- ✅ Actualizar de 10 en 10 productos
- ✅ Verificar después de cada grupo

### Para Precios
- ✅ Investigar competencia local
- ✅ Consultar con personas del rubro
- ✅ Considerar costo de producción
- ✅ Dejar un margen de ganancia decente

### Herramientas
- **Base de datos:** SQLite (imprenta.db)
- **Visualizador:** DB Browser for SQLite
- **Alternativa web:** Ir a `/catalogo` y editar manualmente

---

## 🎯 Estimado de Tiempo

- **Códigos:** 30-60 minutos (SQL) o 2-3 horas (manual)
- **Precios:** 1-2 horas (investigación + actualización)
- **Total:** 2-3 horas

---

## ✅ Cuando Hayas Terminado

1. Reiniciar servidor
2. Verificar en `/catalogo` que todo esté correcto
3. Probar en `/pedidos/nuevo` que los códigos se vean en autocomplete
4. Crear un pedido de prueba
5. Verificar en `/pedidos/pendientes` que el precio sea correcto

---

**¡Listo para actualizar!** 🚀

