# Contrato de datos — entidades de la HU-2

Este documento define la estructura de las entidades **de las que la HU-2 es dueña**
(`Equipo` y `Unidad`). Es la interfaz que el resto de las historias consume en modo
lectura. Cambiarlo requiere acuerdo del grupo (doc. del proyecto, §9).

> La HU-2 **escribe** `Equipo` y `Unidad`. **Lee** `Usuario` (dueño: HU-1) para registrar
> quién hizo un cambio de estado, y `prestamoVigente` (dueño: HU-4). **No** escribe
> `SolicitudPrestamo`, `Prestamo` ni `Reserva`.

---

## Enumerados

| Enumerado | Valores admitidos |
|---|---|
| `categoria` | `medicion`, `audiovisual`, `robotica`, `computo`, `redes`, `lab-fisica` |
| `estadoUnidad` | `disponible`, `prestada`, `mantenimiento`, `baja` |

### Transiciones de estado admitidas

| Desde | Hacia | Quién la provoca |
|---|---|---|
| `disponible` | `prestada` | HU-4, al registrar la entrega |
| `disponible` | `mantenimiento`, `baja` | HU-2, desde el inventario |
| `prestada` | `disponible` | HU-5, al registrar la devolución |
| `prestada` | `mantenimiento` | HU-2 o HU-5, si vuelve con daños |
| `mantenimiento` | `disponible`, `baja` | HU-2 |
| `baja` | — | estado terminal |

Todo cambio de estado exige **motivo** (texto, 5–200 caracteres) y queda registrado en
`unidad.historialEstados`. Desde la vista de inventario, el encargado no mueve una unidad
a `prestada` a mano: eso lo hace la HU-4.

---

## Equipo

Representa el **modelo** de equipo, no la cosa física. Las cosas físicas son las unidades.

```jsonc
{
  "id": "EQ-001",                    // string, PK, inmutable
  "nombre": "Osciloscopio TBS1052B", // string, 3-80, requerido
  "marca": "Tektronix",              // string, 2-40, requerido
  "modelo": "TBS1052B",              // string, 1-40, requerido
  "categoria": "medicion",           // enum categoria, requerido
  "descripcion": "...",              // string, 0-400, opcional, visible en la ficha pública
  "fotografias": [                   // array, 0-6 elementos
    { "url": "https://... | data:image/jpeg;base64,...", "alt": "Vista frontal" }
  ],
  "accesorios": ["Sonda 1X/10X", "Cable de poder"],  // array<string>, 0-12
  "condicionesPrestamo": {
    "duracionMaximaDias": 7,         // entero, 1-90, requerido
    "requiereAutorizacion": true,    // boolean, requerido
    "admiteRenovacion": false,       // boolean, requerido
    "penalidadPorDia": 15            // número en soles, 0-500, requerido (0 = sin penalidad)
  },
  "esBorrador": false,               // boolean: en borrador no se publica en el catálogo
  "creadoEn": "2026-03-02T10:15:00.000Z",     // ISO 8601
  "actualizadoEn": "2026-09-14T08:05:00.000Z" // ISO 8601
}
```

**Unicidad.** La combinación `marca` + `modelo` identifica al equipo y no puede repetirse.

**Fotografías.** El alcance del proyecto no incluye carga de archivos (doc. §4). En la
primera entrega la imagen se reduce en el navegador y se guarda como data URL; también se
admite una dirección `http(s)`.

### Campos derivados (calculados, nunca persistidos)

Se calculan en `derivarEquipo` (`src/domain/catalogos.js`), en un solo lugar, para que
todas las historias obtengan el mismo resultado:

| Derivado | Definición |
|---|---|
| `totalUnidades` | cantidad de unidades del equipo |
| `unidadesDisponibles` | unidades con `estado === "disponible"` |
| `unidadesActivas` | unidades con `estado !== "baja"` |
| `unidadesPorEstado` | conteo por cada valor de `estadoUnidad` |
| `esPublicable` | `unidadesActivas > 0 && !esBorrador` — la HU-3 solo lista equipos publicables |

---

## Unidad

```jsonc
{
  "id": "UN-0001",                   // string, PK, inmutable
  "equipoId": "EQ-001",              // FK -> Equipo.id, requerido
  "codigoInventario": "INV-OSC-0042",// string, formato INV-XXX-0000, único en todo el almacén
  "ubicacion": "Almacén H-102 · anaquel 3",         // requerido, valor de la lista de ubicaciones
  "observaciones": "Sondas completas.",             // string, 0-300, opcional
  "estado": "disponible",            // enum estadoUnidad, requerido
  "prestamoVigente": "PRE-2026-0318",// string | null — lo escribe la HU-4, la HU-2 solo lo lee
  "historialEstados": [
    {
      "de": "mantenimiento",         // enum | null (null = alta de la unidad)
      "a": "disponible",             // enum
      "motivo": "Calibración anual terminada.",  // string, 5-200
      "fecha": "2026-08-20T14:05:00.000Z",       // ISO 8601
      "usuarioId": "US-101"          // FK -> Usuario.id (HU-1)
    }
  ]
}
```

**Ubicaciones admitidas** (`UBICACIONES` en `src/domain/catalogos.js`): Almacén H-102
(anaqueles 1 a 3 y vitrina), Almacén N-005, Lab. Electrónica H-210, Lab. Física N-301 y
Servicio técnico externo.

---

## Usuario (dueño: HU-1)

Archivo semilla: `src/data/seed-usuarios.json`. Las otras historias lo leen con
`listarUsuariosPublicos()` o `useSesion()`, que nunca exponen `contrasenaHash`.

```jsonc
{
  "id": "US-201",
  "nombres": "Renzo Andrés",
  "apellidos": "Mendoza Cárdenas",
  "correo": "rmendoza@aloe.ulima.edu.pe",   // estudiante: @aloe.ulima.edu.pe · encargado: @ulima.edu.pe
  "rol": "estudiante",                      // "estudiante" | "encargado"
  "estado": "activo",                       // "activo" | "por_verificar" | "pendiente_aprobacion" | "bloqueado"
  "contrasenaHash": "…",                    // SHA-256 de "id:contraseña" (bcrypt en la 2.ª entrega)
  "codigo": "20213456",                     // solo estudiante
  "carrera": "Ingeniería Electrónica",      // solo estudiante
  "ciclo": 6,                               // solo estudiante
  "celular": "",
  "deudaPendiente": 0,                      // S/; la calcula la HU-5, hoy viaja en el usuario
  "almacenAsignado": null,                  // solo encargado, p. ej. "Almacén H-102"
  "anexo": null,                            // solo encargado
  "creadoEn": "2026-03-02T14:00:00.000Z"
}
```

---

## Contadores de otras historias

El archivo semilla incluye un bloque `contadoresExternos` que alimenta la navegación del
panel. Son datos de las HU-3 a HU-7; la HU-2 solo los muestra.

```jsonc
{ "solicitudes": 12, "vencidos": 2, "devoluciones": 0, "reservas": 5, "listaEspera": 6, "usuarios": 15 }
```

---

## SolicitudPrestamo (dueño: HU-3)

La HU-3 crea la solicitud y el estudiante la puede retirar mientras está `pendiente`.
La HU-4 la aprueba o rechaza, asigna la unidad y registra la entrega; la HU-5 la cierra
con la devolución. Los nombres de campos siguen el `db.json` del grupo.

Archivo semilla de la primera entrega: `src/data/seed-solicitudes.json`.

```jsonc
{
  "id": "SOL-0101",                 // "SOL-" + 4 dígitos, único
  "estudianteId": "US-201",         // Usuario con rol "estudiante"
  "equipoId": "EQ-001",             // Equipo publicable al momento de solicitar
  "unidadId": null,                 // la asigna la HU-4 al aprobar
  "fechaInicio": "2026-10-26",      // AAAA-MM-DD, no anterior a hoy, hasta 30 días de anticipación
  "fechaFin": "2026-10-30",         // AAAA-MM-DD, posterior a fechaInicio
  "curso": "IN324",                 // código de curso (catálogo CURSOS en domain/solicitudes.js)
  "motivo": "Medición de señales…", // 20 a 500 caracteres
  "estado": "pendiente",            // ver tabla
  "motivoRechazo": "",              // lo llena la HU-4 al rechazar; visible para el estudiante
  "codigoPrestamo": null,           // lo genera la HU-4 al registrar la entrega
  "creadaEn": "2026-10-14T16:20:00.000Z",
  "resueltaEn": null,               // fecha de aprobación, rechazo o retiro
  "resueltaPor": null,              // HU-4: id del encargado que aprobó o rechazó

  // Los pone la HU-4 al registrar la entrega (estado "en_prestamo"):
  "fechaEntregaReal": null,         // ISO con hora
  "accesoriosEntregados": [],       // nombres, tomados de equipo.accesorios
  "detalleAccesorios": [],          // [{ nombre, entregado, nota }] para la constancia
  "observacionesEntrega": "",       // estado inicial del equipo, 5 a 300 caracteres
  "entregadaPor": null              // id del encargado
}
```

`codigoPrestamo` sigue el formato `PRE-AAAA-NNNN` y es el mismo que la HU-2 guarda en
`unidad.prestamoVigente` mientras la unidad está `prestada`.

| `estado`      | Se muestra como | Quién lo pone | ¿Ocupa una unidad? |
|---------------|-----------------|---------------|--------------------|
| `pendiente`   | Enviada         | HU-3          | No                 |
| `aprobada`    | Aprobada        | HU-4          | Sí                 |
| `rechazada`   | Rechazada       | HU-4          | No                 |
| `en_prestamo` | Entregada       | HU-4          | Sí                 |
| `devuelta`    | Devuelta        | HU-5          | No                 |
| `retirada`    | Retirada        | HU-3 (estudiante) | No             |

**Duración.** Se cuenta como en el mockup 3.3: del 16/09 al 21/09 son 5 días
(`fechaFin − fechaInicio`). No puede superar `condicionesPrestamo.duracionMaximaDias` del
equipo. *Pendiente de acordar con la HU-6, que hoy cuenta los días de forma inclusiva.*

**Disponibilidad en un rango.** Una unidad está libre si su estado en el inventario es
`disponible` y no tiene, en esas fechas (inclusivas), una solicitud `aprobada` o
`en_prestamo` ni una reserva confirmada de la HU-6.
