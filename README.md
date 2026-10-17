# Almacén de Equipos — Sistema de Préstamo de Equipos de Laboratorio

Proyecto del curso Programación Web (Universidad de Lima). Primera entrega: interfaz de
usuario en React con los datos manejados íntegramente en el front.

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`. Para compilar la versión de producción: `npm run build`.

Si se ven datos de una prueba anterior, borrar el almacenamiento local del sitio
(F12 → Application → Local Storage → Clear) y recargar.

## Cuentas de prueba

Todas usan la contraseña `Clave2026`.

| Correo | Rol | Caso |
|---|---|---|
| `erivas@ulima.edu.pe` | Encargado de almacén | Cuenta activa |
| `jsalinas@ulima.edu.pe` | Encargado de almacén | Pendiente de aprobación |
| `rmendoza@aloe.ulima.edu.pe` | Estudiante | Sin deuda, con solicitudes en todos los estados |
| `ahuaman@aloe.ulima.edu.pe` | Estudiante | Con deuda pendiente |
| `atorres@aloe.ulima.edu.pe` | Estudiante | Cuenta bloqueada |

## Historias de usuario

| Historia | Responsable | Documentación |
|---|---|---|
| HU-1 Cuenta y acceso | Angelo Cano | `docs/HU-1-cuentas.md` |
| HU-2 Inventario | Rodrigo Ventocilla | `docs/HU-2-inventario.md` |
| HU-3 Catálogo y solicitud | Renzo Bendezú | `docs/HU-3-catalogo.md` |
| HU-4 Aprobación y entrega | Diego Licas | `docs/HU-4-prestamos.md` |
| HU-5 Devoluciones | Josh Miranda | `docs/HU-5-devoluciones.md` |
| HU-6 Reserva anticipada | Felipe Madalengoitia | `docs/HU-6-reservas.md` |

## Estructura

El código está organizado por capas; ningún componente de interfaz accede a los datos.

| Carpeta | Contenido |
|---|---|
| `src/pages/`, `src/components/` | Interfaz: vistas y componentes (los comunes en `components/ui` y `components/layout`) |
| `src/context/` | Estado compartido con Context; único punto que llama a los servicios |
| `src/services/` | Acceso a datos; repiten las validaciones. En la segunda entrega harán `fetch` a la API |
| `src/domain/` | Reglas del negocio como funciones puras |
| `src/data/` | Contrato de datos (`CONTRATO-DATOS.md`) y datos semilla en JSON |

## Tecnologías

React 19, React Router 7, Vite 8 y CSS propio. Las contraseñas se guardan como resumen
SHA-256 (Web Crypto API).
