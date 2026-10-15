# HU-2 — Inventario · Préstamo de equipos de laboratorio

Primera entrega (semana 9): **interfaz de usuario con la data manejada íntegramente en el
front**. Corresponde a la Historia 2 del Tema 7, según el documento funcional y los
mockups de alta fidelidad 2.1 a 2.6.

---

## Cómo ejecutarlo

```bash
npm install
npm run dev      # http://localhost:5173
```

Otros comandos: `npm run build` (compila a `dist/`) y `npm run preview` (sirve lo compilado).

### Rutas

| Ruta | Vista | Mockup | Rol |
|---|---|---|---|
| `/inventario` | Listado de equipos con filtros | 2.1 | Encargado |
| `/inventario/nuevo` | Registro de equipo | 2.2 | Encargado |
| `/inventario/:id/editar` | Edición de equipo | 2.2 | Encargado |
| `/inventario/:id` | Unidades del equipo (+ modales 2.3 y 2.4) | 2.3 / 2.4 | Encargado |
| `/inventario/:id?pestana=condiciones` | Condiciones del préstamo | 2.5 | Encargado |
| `/inventario/:id?pestana=historial` | Historial de estados | — | Encargado |
| `/catalogo/:id` | Ficha pública del equipo | 2.6 | Visitante |

Los datos viven en `localStorage`. Para volver a los datos semilla, borra la clave
`hu2.inventario.v2` desde las herramientas del navegador, o recarga con la pestaña de
aplicación limpia.

---

## Qué cubre de la historia

| Requisito de la HU-2 | Dónde está |
|---|---|
| Registro, edición y eliminación de equipos, con nombre, modelo, marca, categoría, descripción, fotografías y accesorios | `pages/EquipoFormulario.jsx`, `components/inventario/PanelFotografias.jsx`, `ListaAccesorios.jsx` |
| Registro de unidades con código de inventario, ubicación y observaciones | `components/inventario/ModalUnidad.jsx` |
| Estado de la unidad (disponible, prestada, mantenimiento, baja) con sus transiciones y el motivo del cambio | `domain/catalogos.js` (tabla de transiciones) y `components/inventario/ModalCambioEstado.jsx` |
| Condiciones del préstamo por equipo: duración máxima, autorización adicional, renovación | `components/inventario/PanelCondiciones.jsx` |
| Listado con filtros por categoría y estado, búsqueda por código y contador de unidades disponibles | `pages/InventarioLista.jsx`, `components/inventario/FiltrosInventario.jsx` |
| Ficha pública del equipo (la que ve el estudiante) | `pages/FichaPublica.jsx` |

### Requerimientos no funcionales de interfaz

- **Responsiva**: tres cortes (1100 / 960 / 620 px). En móvil la navegación se vuelve
  horizontal y las tablas se desplazan dentro de su marco.
- **En español**, con una sola voz para cada acción (el botón dice "Guardar equipo" y la
  notificación dice "Equipo registrado").
- **Validación junto al campo**: `domain/validaciones.js` devuelve `{ campo: mensaje }` y
  `components/ui/Campo.jsx` lo pinta debajo del control, con `aria-invalid` y
  `aria-describedby`. El formulario de equipo además resume los errores en el panel
  lateral, como en el mockup 2.2.
- **Toda escritura notifica su resultado**: `context/NotificacionContext.jsx`. El Context
  de inventario envuelve cada operación para que ninguna se quede sin aviso.
- **Toda acción destructiva pide confirmación**: `components/ui/Modal.jsx` →
  `<Confirmacion>`, usada al eliminar equipos y unidades.
- **Estados vacíos** en todas las vistas que pueden quedar sin datos: inventario sin
  equipos, filtros sin coincidencias, equipo sin unidades, equipo fuera del catálogo e
  historial sin movimientos.
- **Accesibilidad**: foco visible, modal con foco atrapado y cierre con Escape, rótulos
  asociados a cada control y `prefers-reduced-motion` respetado.

### Organización por capas

```
src/
├── domain/        reglas del negocio: catálogos, transiciones y validaciones
│                  (no conoce React ni de dónde vienen los datos)
├── services/      acceso a datos — ÚNICO archivo que cambia en la segunda entrega
├── context/       estado de la aplicación (useReducer + Context) y notificaciones
├── hooks/         useEquipo, useFormulario, useRetardo
├── components/    interfaz: no importa `services`, le pide todo al Context
├── pages/         una vista por mockup
└── data/          contrato de datos y archivo semilla
```

Ningún componente de interfaz hace consultas: todas pasan por
`context/InventarioContext.jsx`, que es el único que llama a
`services/inventarioService.js`. En la segunda entrega ese archivo cambia sus funciones
por llamadas `fetch` al servicio REST, manteniendo las mismas firmas, y el resto del
código no se toca. Por eso todas sus funciones ya son asíncronas.

No hay credenciales en el repositorio.

---

## Contrato de datos y datos semilla

- `src/data/CONTRATO-DATOS.md` define `Equipo` y `Unidad` con sus campos, tipos y valores
  admitidos, los derivados calculados y la tabla de transiciones. Es la interfaz que
  consumen las demás historias; cambiarlo requiere acuerdo del grupo.
- `src/data/seed-inventario.json` tiene 10 equipos y 35 unidades, con los casos límite
  acordados:
  - equipo en **borrador y sin unidades** (`EQ-009`): no aparece en el catálogo;
  - equipo con **todas las unidades dadas de baja** (`EQ-010`): tampoco aparece;
  - equipo **sin unidades libres** (`EQ-005`): aparece, pero no se puede solicitar;
  - unidades con **historial de varios cambios** y unidades sin observaciones;
  - duración máxima en los dos extremos y penalidad en cero.

### Fronteras con las otras historias

La HU-2 **escribe** `Equipo` y `Unidad`. Solo **lee**:

- `Usuario` (HU-1) para registrar quién hizo cada cambio de estado. La sesión está
  simulada en `context/SesionContext.jsx`, con el mismo contrato que publicará la HU-1:
  cuando esa historia esté lista, se reemplaza ese archivo y nada más.
- `prestamoVigente` de la unidad y los contadores de la navegación (solicitudes,
  vencidos, reservas, lista de espera, usuarios), que vienen del bloque
  `contadoresExternos` del archivo semilla y pertenecen a las HU-3 a HU-7.

Las entregas y devoluciones las registran la HU-4 y la HU-5: por eso, desde el
inventario, el encargado no puede mover una unidad a "prestada" a mano
(`TRANSICIONES_MANUALES` en `domain/catalogos.js`).

---

## Decisiones que conviene saber al sustentar

- **Fotografías sin carga de archivos.** El alcance no incluye *upload* (§4 del
  documento). La imagen que elige el encargado se recorta a 1:1 y se reduce a 480 px en
  el navegador (`utils/imagen.js`); se guarda como data URL junto al resto de la data del
  front. En la segunda entrega, ese es el punto donde entraría el almacenamiento real.
- **Borrador.** El mockup 2.2 incluye "Guardar borrador". Un equipo en borrador se
  registra y se edita, pero no se publica en el catálogo aunque tenga unidades activas.
- **`esPublicable`.** Un equipo se lista en el catálogo de la HU-3 solo si tiene al menos
  una unidad activa (no dada de baja) y no es borrador. El cálculo está en un solo lugar,
  `derivarEquipo`, para que la HU-3 y la HU-2 nunca discrepen.
- **Eliminar.** No se permite eliminar un equipo ni una unidad con préstamo vigente; el
  servicio responde con el equivalente a un 409 y la interfaz lo muestra como error.
- **Penalidad por día.** Aparece en el mockup 2.5 y en la frase de condiciones de la
  ficha 2.6, así que se incorporó al contrato de datos como parte de
  `condicionesPrestamo`.

---

## Tecnologías

React 18 con React Router y estado en hooks y Context. CSS propio en `src/styles`
(sin plantillas de administración ni librerías de componentes). Vite como empaquetador.
