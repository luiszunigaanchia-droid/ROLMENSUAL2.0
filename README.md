# Gestión de Roles HSJD — PWA local

Aplicación instalable y offline para crear, revisar, imprimir y respaldar roles mensuales del Laboratorio Clínico HSJD.

## Conservación de datos anteriores

Al abrir esta versión por primera vez en el mismo navegador y dirección de GitHub Pages, la aplicación busca y migra automáticamente las claves usadas por la versión anterior:

- `hsjd_roles_store_drag_v3_7`
- `hsjd_employees_list_v1`
- `hsjd_employees_info_v1`

La migración crea una nueva base IndexedDB llamada `hsjdRolesDB`. Las claves antiguas no se eliminan, por lo que permanecen como respaldo técnico.

Antes de reemplazar la versión publicada, exporte también la copia JSON desde la aplicación actual.

## Publicación en GitHub Pages

1. Extraiga el ZIP.
2. Suba **el contenido interno** de la carpeta `rol-pwa-final` a la raíz del repositorio `rol`.
3. Mantenga las carpetas `js`, `icons` y `tests`.
4. Espere la publicación de GitHub Pages.
5. Abra la página con conexión y recárguela una vez.

## Prueba local en Windows

Ejecute `iniciar.bat`. La aplicación abrirá `http://localhost:8000`.

El iniciador usa Python cuando está disponible. Si no lo encuentra, utiliza el servidor PowerShell incluido. No requiere Node.js ni `npx`.

## Respaldo

Use **Exportar respaldo** regularmente. El JSON incluye:

- catálogo de personal;
- asignaciones de todos los meses;
- auditoría local;
- configuración no temporal.

La importación reemplaza la base local después de solicitar confirmación.

## Seguridad y alcance

Los datos se guardan únicamente en el navegador. No existe servidor, cuenta, autenticación central ni sincronización entre equipos. La PWA evita insertar nombres, notas o datos importados mediante HTML dinámico.
