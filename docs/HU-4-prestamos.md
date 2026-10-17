# HU-4 — Aprobación y entrega

Vistas del encargado 4.1 a 4.6. La HU-4 resuelve las solicitudes que crea la HU-3 en el
almacén compartido `hu3.solicitudes.v1` (ver `services/solicitudesAlmacen.js`). Solo
escribe los estados `aprobada`, `rechazada` y `en_prestamo`. Para marcar la unidad como
prestada usa `cambiarEstadoUnidad` de la HU-2; los estudiantes los lee de la HU-1.

## Vistas

| Ruta | Vista | Mockup |
|---|---|---|
| `/solicitudes` | Bandeja con pestañas por estado y contadores, filtros por equipo y fechas, búsqueda y paginación de 8 | 4.1 |
| (modal) | Aprobar asignando una unidad libre en todo el rango; si no hay, propone el próximo rango | 4.2 |
| (modal) | Rechazar con motivo y explicación visible para el estudiante | 4.3 |
| `/entregas/:solicitudId` | Registrar la entrega: fecha y hora, accesorios y estado inicial, con vista previa | 4.4 |
| `/constancias/:codigo` | Constancia con el código del préstamo; la ven el encargado y el estudiante dueño | 4.5 |
| `/prestamos`, `/vencidos` | Préstamos vigentes agrupados en vencidos, vencen hoy y en curso | 4.6 |

Los filtros de la bandeja viven en la URL (`/solicitudes?estado=todos&equipoId=EQ-001&desde=2026-11-01&texto=renzo`).

## Archivos

| Capa | Archivo |
|---|---|
| Reglas | `domain/prestamos.js` (motivos, validaciones, código PRE-AAAA-NNNN, vigencia) |
| Datos | `services/prestamosService.js` |
| Estado | `context/PrestamosContext.jsx` (contadores del panel y `version` para recargar) |
| Interfaz | `pages/BandejaSolicitudes.jsx`, `RegistrarEntrega.jsx`, `ConstanciaEntrega.jsx`, `PrestamosVigentes.jsx`, `components/prestamos/*` |
| Estilos | `styles/prestamos.css` (incluye la hoja de impresión de la constancia) |

## Reglas

- Solo un encargado `activo` aprueba, rechaza o entrega (validado en la vista y en el servicio).
- Solo se resuelve una solicitud `pendiente`; solo se entrega una `aprobada`.
- La unidad asignada debe estar `disponible` y sin otra solicitud aprobada o entregada, ni
  reserva de la HU-6, que se cruce con el rango (la misma regla que usa la HU-3).
- Si el equipo pide autorización del docente, hay que confirmarla antes de aprobar.
- El rechazo exige un motivo de la lista y una explicación de 10 a 300 caracteres; el estudiante
  la ve en «Mis solicitudes».
- La entrega no puede registrarse en el futuro ni después de la devolución pactada; las
  observaciones del estado inicial son obligatorias (5 a 300 caracteres).
- Al entregar: se genera el código `PRE-AAAA-NNNN`, la solicitud pasa a `en_prestamo` y la
  unidad a `prestada` en el inventario con ese código.
- Vigencia: vencido si la devolución pactada ya pasó, «vence hoy» si es hoy; la hora límite es 19:00.
- Se avisa cuando el solicitante tiene deuda pendiente (vista 5.5), sin bloquear la aprobación.

## Para probar

Ingresa como `erivas@ulima.edu.pe` (contraseña `Clave2026`).

- Bandeja: 7 enviadas; Alejandra y Lucía aparecen con deuda (S/ 105.00 en total).
- Aprobar la cámara de Alejandra: muestra el aviso de deuda y las unidades libres.
- Aprobar el osciloscopio de Sebastián (3 al 6/11): no quedan unidades y propone del 07/11 al 10/11.
- Aprobar el osciloscopio de Renzo: pide confirmar la autorización del docente.
- Entregar el analizador de Mateo: genera `PRE-2026-0332` y la unidad `INV-RED-0001` pasa a prestada.
- Préstamos vigentes: 2 vencidos, 1 vence hoy (con la fecha del 17/10/2026).
- Como estudiante (`ahuaman@aloe.ulima.edu.pe`), «Ver constancia» abre `PRE-2026-0321`.

## Pendiente con el grupo

- La HU-5 debe pasar la solicitud a `devuelta` y la unidad a `disponible` o `mantenimiento`
  desde «Registrar devolución».
- «Renovar» (mockup 4.6) depende de `condicionesPrestamo.admiteRenovacion`; queda para la
  segunda entrega.
