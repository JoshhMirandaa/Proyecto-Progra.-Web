# HU-3 — Catálogo y solicitud

Vistas del estudiante, según los mockups 3.1 a 3.4. En la primera entrega las solicitudes
viven en el navegador, en la clave `hu3.solicitudes.v1` de `localStorage`, y parten de
`src/data/seed-solicitudes.json`. Equipos y unidades se leen del servicio de la HU-2
(`listarEquiposConUnidades`) y las reservas del de la HU-6; la HU-3 no escribe sobre ellos.

## Vistas

| Ruta | Vista | Mockup |
|---|---|---|
| `/catalogo` | Catálogo con filtros, búsqueda, orden y paginación | 3.1 |
| `/catalogo/:id` | Detalle del equipo con su disponibilidad (estudiante) | 3.2 |
| `/catalogo/:id/solicitar` | Formulario de solicitud | 3.3 |
| `/mis-solicitudes` | Mis solicitudes, con filtro, detalle y retiro | 3.4 |

El visitante ve el catálogo en modo lectura; al abrir un equipo ve la ficha pública 2.6
de la HU-2. El encargado sigue entrando al inventario.

Los filtros del catálogo viven en la URL (`?cat=robotica&disp=libres&dur=7&q=osc&orden=nombre-asc&pag=2`),
así se conservan al volver del detalle y la búsqueda de la barra superior llega al catálogo.

## Archivos

| Capa | Archivo |
|---|---|
| Reglas | `domain/solicitudes.js` (estados, cursos, fechas, `validarSolicitud`) |
| Datos | `services/catalogoService.js`, `data/seed-solicitudes.json` |
| Estado | `context/CatalogoContext.jsx`, `context/catalogoReducer.js` |
| Hooks | `useFiltrosCatalogo`, `useListaCatalogo`, `useDetalleEquipo`, `useDisponibilidad` |
| Interfaz | `pages/Catalogo.jsx`, `DetalleEquipoCatalogo.jsx`, `SolicitudFormulario.jsx`, `MisSolicitudes.jsx`, `components/catalogo/*`, `components/layout/MarcoEstudiante.jsx` |
| Estilos | `styles/catalogo.css` |

## Reglas

- El catálogo lista solo equipos publicables: con al menos una unidad activa y que no son borrador.
- Duración máxima: `fechaFin − fechaInicio` no supera la del equipo (del 16/09 al 21/09 son 5 días).
- La fecha de inicio no puede ser anterior a hoy ni estar a más de 30 días; para más adelante se usa una reserva (HU-6).
- Motivo de 20 a 500 caracteres, curso obligatorio y aceptación de condiciones.
- Si no hay unidades libres en el rango, se avisa y se propone el próximo rango libre de la misma duración.
- No se puede tener dos solicitudes abiertas del mismo equipo en fechas que se cruzan.
- Un estudiante con deuda pendiente no puede solicitar (la deuda es de la HU-5; hoy viaja en el usuario de la HU-1).
- Solo se retira una solicitud `pendiente`, previa confirmación.
- Todas las reglas se validan en el formulario y otra vez en el servicio.

## Para probar

Ingresa en `/login` con una cuenta de prueba (contraseña `Clave2026` para todas; la lista
está en el recuadro «Cuentas de prueba» del inicio de sesión):

- `rmendoza@aloe.ulima.edu.pe` — estudiante con solicitudes en todos los estados.
- `cquispe@aloe.ulima.edu.pe` — estudiante con deuda (S/ 45.00): no puede solicitar.
- Sin sesión, el catálogo se ve en modo lectura y «Mis solicitudes» pide iniciar sesión.

Casos:

- Osciloscopio del 2 al 5 de noviembre: no hay unidades (tres solicitudes aprobadas) y propone del 7 al 10.
- Multímetro Fluke: sin unidades libres; se libera el 18/10.
- Una solicitud entregada abre su constancia (HU-4) con «Ver constancia».

## Pendiente con el grupo

- Contar la duración igual en HU-3 y HU-6 (el mockup 3.3 no suma el día de inicio; la HU-6 sí).
- Las reservas que la HU-6 convierte en solicitudes se guardan en su propio almacén; en la
  segunda entrega deben ir a la colección `solicitudes` del contrato.
- Pasar `seed-solicitudes.json` al `db.json` del grupo cuando se unifique el contrato.
