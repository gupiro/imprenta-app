-- ============================================
-- ACTUALIZAR CÓDIGOS DE PRODUCTOS CORRELATIVOS
-- ============================================
-- Formato: NNN-X donde NNN es número (001-072) y X es letra del grupo
-- Ejecutar en SQLite: sqlite3 imprenta.db < actualizar-codigos.sql

-- TALONARIOS (001-T a 011-T)
UPDATE catalogo_productos SET codigo = '001-T' WHERE nombre LIKE '%Talonario 1/2 Oficio x Duplicado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '002-T' WHERE nombre LIKE '%Talonario 1/2 Oficio x Triplicado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '003-T' WHERE nombre LIKE '%Talonario A4 Duplicado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '004-T' WHERE nombre LIKE '%Talonario A4 x Triplicado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '005-T' WHERE nombre LIKE '%Talonario 1/2%' AND nombre NOT LIKE '%Oficio%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '006-T' WHERE nombre LIKE '%Talonario 1/3%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '007-T' WHERE nombre LIKE '%Talonario Oficio x Duplicado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '008-T' WHERE nombre LIKE '%Talonario Oficio x Triplicado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '009-T' WHERE nombre LIKE '%Talonario Oficio x Quadrup%' OR nombre LIKE '%Talonario Oficio x Cuádruple%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '010-T' WHERE nombre LIKE '%A4 Logo Color%' AND nombre NOT LIKE '%Oficio%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '011-T' WHERE nombre LIKE '%1/2 Oficio Logo Color%' LIMIT 1;

-- ENTRADAS (012-E a 017-E)
UPDATE catalogo_productos SET codigo = '012-E' WHERE nombre LIKE '%Entradas 6 Tal%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '013-E' WHERE nombre LIKE '%Entradas Logo Color 8 Tal%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '014-E' WHERE nombre LIKE '%Entradas 12 Tal%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '015-E' WHERE nombre LIKE '%Entradas Logo Color%' AND nombre NOT LIKE '%8 Tal%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '016-E' WHERE nombre LIKE '%Entradas Full Color%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '017-E' WHERE nombre LIKE '%TAL.ABROCHADOS%' LIMIT 1;

-- BONO CONTRIBUCIÓN (018-B a 019-B)
UPDATE catalogo_productos SET codigo = '018-B' WHERE nombre LIKE '%Bono Contribución 500%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '019-B' WHERE nombre LIKE '%Bono Contribución 1000%' LIMIT 1;

-- IMPRESIÓN COLOR (020-I a 025-I)
UPDATE catalogo_productos SET codigo = '020-I' WHERE nombre LIKE '%Impresión Color A4%' AND nombre NOT LIKE '%Cartulina%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '021-I' WHERE nombre LIKE '%Impresión Color A3%' AND nombre NOT LIKE '%Cartulina%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '022-I' WHERE nombre LIKE '%Impresión Color A4 Cartulina%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '023-I' WHERE nombre LIKE '%Impresión Color A3 Cartulina%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '024-I' WHERE nombre LIKE '%Impresión Papel IMP/B Nº A4%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '025-I' WHERE nombre LIKE '%Impresión Papel IMP/B Nº A3%' LIMIT 1;

-- FOTOGRÁFICO/FOTOCOPIAS (026-F a 031-F)
UPDATE catalogo_productos SET codigo = '026-F' WHERE nombre LIKE '%Fotográfico%' AND nombre NOT LIKE '%Papel%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '027-F' WHERE nombre LIKE '%Fotográfico Papel%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '028-F' WHERE nombre LIKE '%Fotocopias Blanco y Negro%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '029-F' WHERE nombre LIKE '%Fotocopias Color%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '030-F' WHERE nombre LIKE '%Fotocopias 150 Blanco/Negro%' AND nombre NOT LIKE '%A3%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '031-F' WHERE nombre LIKE '%Fotocopias 150 Blanco/Negro A3%' LIMIT 1;

-- TARJETAS (032-J a 036-J)
UPDATE catalogo_productos SET codigo = '032-J' WHERE nombre LIKE '%Tarjeta Personal%' AND nombre NOT LIKE '%10x15%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '033-J' WHERE nombre LIKE '%Tarjeta Personal 10x15%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '034-J' WHERE nombre LIKE '%Tarjetas Cartulina 1/8%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '035-J' WHERE nombre LIKE '%Tarjetas Cartulina 1/4%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '036-J' WHERE nombre LIKE '%Tarjetas Certificados A3%' LIMIT 1;

-- LONA/BANNER/VINILO (037-L a 042-L)
UPDATE catalogo_productos SET codigo = '037-L' WHERE nombre LIKE '%Banner Público%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '038-L' WHERE nombre LIKE '%Lona Front%' AND nombre NOT LIKE '%High%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '039-L' WHERE nombre LIKE '%Lona Back%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '040-L' WHERE nombre LIKE '%Lona Front High%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '041-L' WHERE nombre LIKE '%Vinilo BB%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '042-L' WHERE nombre LIKE '%Vinilo TR%' LIMIT 1;

-- SELLOS/DISTINTIVOS (043-S a 046-S)
UPDATE catalogo_productos SET codigo = '043-S' WHERE nombre LIKE '%Sello Público%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '044-S' WHERE nombre LIKE '%Sello Bolsillo%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '045-S' WHERE nombre LIKE '%Cambio%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '046-S' WHERE nombre LIKE '%Carnet%' LIMIT 1;

-- 3D/SUBLIMADO (047-D a 049-D)
UPDATE catalogo_productos SET codigo = '047-D' WHERE nombre LIKE '%Llaveros%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '048-D' WHERE nombre LIKE '%Plastificado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '049-D' WHERE nombre LIKE '%Anillado%' LIMIT 1;

-- ACCESORIOS Y SERVICIOS (050-A a 066-A)
UPDATE catalogo_productos SET codigo = '050-A' WHERE nombre LIKE '%Sublimado en Gorra%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '051-A' WHERE nombre LIKE '%Sublimado en DIE%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '052-A' WHERE nombre LIKE '%Estampado en Gorra%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '053-A' WHERE nombre LIKE '%Micro%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '054-A' WHERE nombre LIKE '%Ploteo Tapa%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '055-A' WHERE nombre LIKE '%Cerámica%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '056-A' WHERE nombre LIKE '%Gremio%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '057-A' WHERE nombre LIKE '%Canvas%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '058-A' WHERE nombre LIKE '%Bandera 1.50x1%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '059-A' WHERE nombre LIKE '%Mueble%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '060-A' WHERE nombre LIKE '%Acrílico%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '061-A' WHERE nombre LIKE '%UNSA%' LIMIT 1;

-- RESMAS Y PAPELES (062-R a 067-R)
UPDATE catalogo_productos SET codigo = '062-R' WHERE nombre LIKE '%Resma Logo Color%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '063-R' WHERE nombre LIKE '%Resma 1/Azul%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '064-R' WHERE nombre LIKE '%Resma Encolada Azul%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '065-R' WHERE nombre LIKE '%Resma 1/ Negra%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '066-R' WHERE nombre LIKE '%Resma Encolado%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '067-R' WHERE nombre LIKE '%Talonarios 3 500%' LIMIT 1;

-- CLÍNICA/TARJETA/CARATULA (068-C a 071-C)
UPDATE catalogo_productos SET codigo = '068-C' WHERE nombre LIKE '%Clínica%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '069-C' WHERE nombre LIKE '%Certificados A3%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '070-C' WHERE nombre LIKE '%Adhesivo%' LIMIT 1;
UPDATE catalogo_productos SET codigo = '071-C' WHERE nombre LIKE '%Carátula A/L%' OR nombre LIKE '%Ficha 10x14%' LIMIT 1;

-- PATENTE (072-P)
UPDATE catalogo_productos SET codigo = '072-P' WHERE nombre LIKE '%Patente%' LIMIT 1;

-- VERIFICACIÓN
SELECT codigo, nombre, precio_base FROM catalogo_productos ORDER BY id;
