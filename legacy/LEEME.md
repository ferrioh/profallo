# ProTrainer

Panel local para un entrenador, con la estética de las referencias: negro, lima, tarjetas redondeadas y bloques blancos. Adaptado para escritorio y móvil; no es una copia exacta de todas las pantallas de Behance.

## Abrir

Doble clic en **ABRIR_PROTRAINER.cmd** o en **index.html**. No necesitas instalar paquetes ni conexión a Internet.

También puedes iniciar **INICIAR_SERVIDOR.cmd** (requiere Node.js) y abrir **http://localhost:5417**. Usa siempre la misma dirección y navegador para mantener el mismo espacio de datos: el archivo local y localhost guardan por separado.

## Qué funciona

- Registrar y editar clientes: contacto, objetivo, plan, mensualidad, medidas, notas y rutina asignada.
- Archivar y restaurar fichas, sin borrar su historial.
- Crear rutinas con ejercicios, series, repeticiones y descanso; asignarlas a clientes.
- Programar, modificar, completar y cancelar sesiones. Comprobar coincidencias de horario.
- Calendario mensual de sesiones y vencimientos, con detalle por día.
- Registrar pagos pendientes y recibidos, método, fecha, importe y concepto. Filtrar por mes y estado.
- Mediciones de peso, cintura y grasa corporal, con evolución y observaciones.
- Perfil del entrenador, moneda, exportación JSON, importación JSON y exportación de clientes CSV.

Los primeros registros son **datos ficticios de ejemplo**, claramente identificados como DEMO LOCAL. En Ajustes puedes empezar sin ellos: primero se descarga un respaldo de los registros anteriores.

## Guardado

Los datos se conservan en localStorage del navegador. No hay backend, usuarios autenticados, cobros bancarios, mensajes automáticos ni sincronización entre dispositivos. Registrar un pago solo actualiza tu control administrativo.

Exporta respaldos periódicamente desde Ajustes. Borrar los datos del navegador, usar otro navegador o cambiar de dirección puede cambiar o eliminar el guardado. Un respaldo contiene contactos, notas, medidas y datos de pagos; consérvalo en un lugar privado.

## Diseño actualizado

- Foto del entrenador al centro y perfil propio, accesible desde su avatar.
- Distintivo de verificado visual: no implica una verificación de identidad externa.
- Tres fotos proporcionadas para las fichas de Valentina, Sofía y Daniela.
- Glass selectivo, tarjetas blancas y lima, accesos rápidos a sesiones, clientes y rutinas.
- Rutinas desplegables y editor de ejercicios por tarjetas.
- Motion 14 incluido localmente: entradas, despliegues y confirmación de asignación con `arc()`. Respeta la preferencia de movimiento reducido.

## Editar

- `index.html`: estructura principal.
- `styles.css`: diseño y adaptación a móvil.
- `app.js`: módulos, formularios, calendario y datos locales.
- `modern.css` y `modern.js`: perfil, fotografías, tarjetas y animaciones actuales.
- `assets/`: fotografías, Motion y su licencia. La ilustración anterior ya no aparece en la portada.
- `server.cjs`: servidor opcional limitado a tu equipo.

Referencia visual: [Fitness & Healthcare Mobile App / UX/UI Design](https://www.behance.net/gallery/178304479/Fitness-Healthcare-Mobile-App-UXUI-Design), de Evgeny Shkatula y colaboradores; combinada con la imagen proporcionada. No se reutilizaron las imágenes de presentación de Behance como interfaz funcional.
