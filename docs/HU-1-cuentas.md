# HU-1 — Cuenta y acceso

Vistas 1.1 a 1.7. La HU-1 es dueña del usuario: registro, verificación, inicio de sesión,
recuperación, perfil y protección de rutas por rol. En la primera entrega los usuarios
parten de `src/data/seed-usuarios.json` y viven en `localStorage` (`hu1.usuarios.v1`).

## Vistas

| Ruta | Vista | Mockup |
|---|---|---|
| `/` | Portada pública (con sesión, cada rol va a su inicio) | 1.1 |
| `/login` | Inicio de sesión, con «Recordarme» | 1.2 |
| `/registro` | Registro de estudiante | 1.3 |
| `/registro-encargado` | Alta de encargado (queda pendiente de aprobación) | 1.4 |
| `/recuperar`, `/restablecer?token=` | Recuperar contraseña en tres pasos | 1.5 |
| `/verificar?token=` | Verificación de la cuenta | 1.3 |
| `/mi-cuenta` | Datos personales, cambio de contraseña y resumen de préstamos | 1.6 |
| (cualquier ruta sin permiso) | 403 dentro del marco del propio rol | 1.7 |
| (ruta inexistente) | 404 | 1.7 |

## Archivos

| Capa | Archivo |
|---|---|
| Reglas | `domain/cuentas.js` (dominios, contraseña, validaciones, `destinoTrasIngresar`) |
| Datos | `services/cuentasService.js`, `data/seed-usuarios.json`, `utils/hash.js` |
| Estado | `context/SesionContext.jsx` (único que llama al servicio) |
| Interfaz | `pages/IniciarSesion.jsx`, `RegistroEstudiante.jsx`, `RegistroEncargado.jsx`, `RecuperarAcceso.jsx`, `RestablecerContrasena.jsx`, `VerificarCuenta.jsx`, `MiCuenta.jsx`, `AccesoDenegado.jsx`, `PaginaNoEncontrada.jsx`, `Inicio.jsx` |
| Componentes | `components/cuenta/RutaProtegida.jsx`, `PasosRecuperacion.jsx`, `components/layout/MarcoSegunRol.jsx`, `MenuUsuario.jsx` |
| Estilos | `styles/cuenta.css` |

## Reglas

- Estudiantes solo con `@aloe.ulima.edu.pe`; encargados con `@ulima.edu.pe`.
- Contraseña de al menos 8 caracteres con una mayúscula y un número; se guarda como SHA-256
  (`id:contraseña`), nunca en texto plano. En la segunda entrega, bcrypt en el servidor.
- La cuenta nueva queda `por_verificar` hasta abrir el enlace (24 h). El alta de encargado
  queda `pendiente_aprobacion`: puede ingresar y mirar, pero no aprobar ni entregar.
- Cinco intentos fallidos bloquean el correo 15 minutos. Una cuenta `bloqueado` no ingresa.
- La recuperación responde igual exista o no el correo (no revela cuentas). El enlace dura 60 min.
- Sin sesión, una ruta protegida lleva a `/login` y, al ingresar, vuelve a la ruta pedida si
  el rol puede verla. Con el rol equivocado se muestra el 403.
- Al cerrar sesión no se recuerda la página del usuario anterior.
- La sesión vive en `sessionStorage`; con «Recordarme», en `localStorage`.
- Los correos se simulan: el servicio devuelve el enlace y la vista lo muestra como «enlace de prueba».

## Cuentas de prueba (contraseña `Clave2026`)

| Correo | Rol | Caso |
|---|---|---|
| `erivas@ulima.edu.pe` | Encargado | Activa (Almacén H-102) |
| `jsalinas@ulima.edu.pe` | Encargado | Pendiente de aprobación |
| `rmendoza@aloe.ulima.edu.pe` | Estudiante | Sin deuda, con historial |
| `ahuaman@aloe.ulima.edu.pe` | Estudiante | Deuda S/ 60.00 |
| `atorres@aloe.ulima.edu.pe` | Estudiante | Cuenta bloqueada |

## Para las otras historias

- `useSesion()` da `usuario`, `rol`, `conSesion`, `esEncargado`, `esEstudiante`,
  `encargadoActivo` y `almacen`. Para proteger una ruta: `<RutaProtegida roles={['encargado']}>`.
- `listarUsuariosPublicos()` devuelve los usuarios sin el hash de la contraseña (la usa la HU-4).
