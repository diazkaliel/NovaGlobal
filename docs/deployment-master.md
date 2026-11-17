# Actualización de master

La integración conserva los módulos de master (ventas, caja, recetas, máquinas,
usuarios, asistencia, cotizaciones, portal y simulador) y añade el ingreso
simplificado de órdenes Bravo, reintentos seguros, archivado e historial.

## Despliegue en el notebook servidor

1. Crear y comprobar un respaldo de PostgreSQL y de `nova/backend/uploads`.
2. Detener el backend para evitar escrituras durante las migraciones.
3. Actualizar la rama `master` con `git pull --ff-only origin master`.
4. Desde `nova/backend`, activar el entorno del servidor e instalar
   `python -m pip install -r requirements.txt`.
5. Con el `.env` del servidor, ejecutar `python -m alembic current`,
   `python -m alembic upgrade head` y `python -m alembic current`.
   El resultado final debe ser `ce62d881f205` y una sola cabecera.
   Si una migración falla, conservar el error y mantener el backend detenido;
   no usar `alembic stamp` para ocultarlo.
6. Desde `nova/frontend`, ejecutar `npm ci` y `npm run build` y publicar `dist`
   usando el procedimiento habitual del servidor.
7. Reiniciar el backend y comprobar inicio de sesión, listado de inventario,
   creación de una orden y consulta de su historial.

Las migraciones unen ambos historiales y agregan tablas/columnas de master que
antes dependían del arranque. Reconocen objetos ya creados por ese arranque.
No reinician el inventario. Las pruebas verifican actualización desde ambas
ramas conservando stock y el contador de órdenes Bravo existente.

El API de órdenes de catálogo permanece en `/bravo/orders`; el módulo nativo
adicional de master está en `/bravo/native/orders`. `/repairs` sigue siendo
el API de Nova. El registro de usuarios requiere administrador.

La reconciliación del esquema no tiene una reversión destructiva automática:
para volver al esquema anterior se necesita el respaldo comprobado.

## Validación de la integración

- 62 pruebas de backend y 22 subpruebas sobre PostgreSQL temporal.
- Migraciones desde una base vacía y desde las dos cabeceras anteriores.
- Navegador en 320, 375, 390, 768 y 1280 px: navegación, creación, reintento,
  cambio de precios, PDF, cancelación, archivado y permisos de técnico.
- Compilación de producción y prueba de claves de reintento correctas.
- Auditoría npm sin vulnerabilidades. La compilación avisa del tamaño del bundle.

Estas comprobaciones no sustituyen el respaldo ni la verificación del notebook
servidor, al que no se ha accedido durante la integración.
