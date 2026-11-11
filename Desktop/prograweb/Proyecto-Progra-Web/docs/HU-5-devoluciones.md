# HU-5 — Devoluciones

Vistas del encargado 5.1 a 5.5 (y «Mi deuda» del estudiante). La HU-5 cierra los préstamos
que entregó la HU-4, en el almacén compartido de solicitudes (`services/solicitudesAlmacen.js`).
Solo escribe el estado `devuelta`, la renovación y los campos de la devolución. La unidad la
cambia con `cambiarEstadoUnidad` de la HU-2 y la deuda la guarda con `establecerDeuda` de la HU-1.

## Vistas

| Ruta | Vista | Mockup |
|---|---|---|
| `/devoluciones` | Préstamos por devolver y búsqueda por código | 5.1 |
| `/devoluciones?codigo=PRE-2026-0321` | Registro de la devolución: fecha, accesorios, estado de retorno, retraso y penalidad | 5.1 |
| (modal) | Daños o faltantes: descripción, accesorios faltantes, fotografía y derivación a mantenimiento | 5.2 |
| (modal) `?accion=renovar` | Renovación: posible o bloqueada (no admite, lista de espera, unidad comprometida, vencido) | 5.3 |
| `/estudiantes/:id` | Historial del estudiante con retrasos, penalidades y «Registrar pago» | 5.4 |
| (en 5.4 y en la bandeja 4.1) | Aviso de deuda pendiente | 5.5 |
| `/mi-deuda` | El estudiante ve su propia deuda e historial | 5.4 |

## Archivos

| Capa | Archivo |
|---|---|
| Reglas | `domain/devoluciones.js` (estados de retorno, retraso, penalidad, validaciones, renovación, deuda) |
| Datos | `services/devolucionesService.js` |
| Estado | `context/DevolucionesContext.jsx` (refresca inventario y préstamos tras cada cambio) |
| Interfaz | `pages/RegistrarDevolucion.jsx`, `pages/HistorialEstudiante.jsx`, `components/devoluciones/ModalDanos.jsx`, `ModalRenovacion.jsx` |
| Estilos | `styles/devoluciones.css` |

## Reglas

- La fecha de retorno no puede ser futura ni anterior a la entrega.
- Retraso = fecha de retorno − devolución pactada (en días). Penalidad = retraso × `penalidadPorDia` del equipo.
- Si falta un accesorio, el retorno no puede ser «sin novedades». Con daños, la descripción es obligatoria (10 a 400 caracteres).
- Con daños o faltantes se puede derivar la unidad a mantenimiento; si no, vuelve a disponible. Se avisa si la unidad tenía préstamos aprobados o reservas por delante.
- Renovación: solo si el equipo la admite, el préstamo no está vencido, no se renovó antes, nadie está en la lista de espera de ese equipo (HU-6) y la misma unidad sigue libre; hasta la duración máxima del equipo.
- La deuda es la suma de penalidades pendientes y se guarda en el usuario (HU-1): con deuda, el estudiante no puede solicitar (HU-3) y la bandeja lo avisa (HU-4).
- «Registrar pago» marca las penalidades como pagadas y deja la deuda en cero.
- Los accesorios faltantes quedan registrados «por valorizar»: no suman monto en esta entrega.
- Solo un encargado activo registra devoluciones, renovaciones y pagos; el estudiante solo ve su propio historial.

## Para probar

Ingresa como `erivas@ulima.edu.pe` (contraseña `Clave2026`).

- `PRE-2026-0317` (trípode de Fabiana, vence 19/10): devolución a tiempo; la unidad vuelve a disponible.
- `PRE-2026-0321` (cámara de Alejandra, venció 14/10): 3 días de retraso, S/ 60.00; desmarca «Correa» y deriva a mantenimiento.
- Renovar `PRE-2026-0330` (multímetro de Renzo): posible, hasta 10 días. `PRE-2026-0318` (osciloscopio): el equipo no admite renovación.
- Historial de Alejandra desde la bandeja (clic en su nombre) y «Registrar pago».
- Como `cquispe@aloe.ulima.edu.pe`, «Mi deuda» muestra S/ 45.00 por `PRE-2026-0291`.

Los días de retraso dependen de la fecha de hoy; los datos están pensados para el 17/10/2026.

## Reemplaza

La versión anterior (`pages/devoluciones.jsx`) leía `db.json`, no guardaba nada y no tocaba el
inventario. La rama `hu5-devoluciones` del repositorio queda reemplazada por esta y no debe fusionarse.
