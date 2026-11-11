# HU-6 — Reserva anticipada

La primera entrega mantiene las reservas en el navegador, en la clave
`hu6.reservas.v1` de `localStorage`. El inventario y las unidades se consultan desde
`hu2.inventario.v2`; HU-6 no modifica esas entidades.

## Vistas

| Ruta | Vista |
|---|---|
| `/reservas` | Calendario mensual por equipo y formulario para solicitar una reserva |
| `/mis-reservas` | Reservas del usuario en sesión, con filtro por estado y cancelación |
| `/lista-espera` | Solicitudes en espera del usuario, ordenadas por turno para rangos solapados |

El calendario cuenta unidades libres, reservadas y prestadas en cada día. Como el
inventario semilla solo identifica si una unidad está prestada, pero no da el rango del
préstamo vigente, esas unidades se consideran ocupadas durante todo el calendario.

## Reglas

- La fecha inicial debe ser futura y la final igual o posterior a la inicial.
- La duración inclusiva no puede exceder el máximo de préstamo del equipo.
- Las fechas se consideran inclusivas al detectar solapamientos.
- Se asigna una unidad disponible que no tenga otra reserva confirmada o convertida en
  un rango que se cruce.
- Si quedan unidades reservables pero todas están comprometidas, la solicitud entra a
  la lista de espera. Las unidades en mantenimiento o dadas de baja no se asignan.
- La cancelación requiere confirmación. Al liberar una unidad se promueve, en orden de
  llegada, la primera solicitud en espera que pueda cubrirse.
- Al abrir la aplicación, las reservas confirmadas cuyo inicio ocurra dentro de los
  siguientes siete días se convierten en solicitudes pendientes. La solicitud conserva
  el equipo, la unidad, el usuario, las fechas y el motivo de la reserva.

La conversión produce registros `SOL-*` en la colección local `solicitudes` junto a las
reservas. En la segunda entrega, la integración debe conectarlos al contrato compartido
de `SolicitudPrestamo` de HU-3 / HU-4 y ejecutarse desde el servicio web.
