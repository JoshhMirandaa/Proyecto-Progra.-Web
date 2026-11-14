import seedUsuarios from '../data/seed-usuarios.json';

const API_URL = 'http://localhost:3000/api';
const CLAVE_SESION = 'almacen_sesion_activa';
const CLAVE_TOKEN = 'almacen_token_jwt';

// Convierte campos null de PostgreSQL a '' para evitar advertencias en los <input> de React
function sanitizarUsuario(u) {
  if (!u) return null;
  return {
    ...u,
    telefono: u.telefono ?? '',
    codigo: u.codigo ?? '',
    carrera: u.carrera ?? '',
    nombres: u.nombres ?? '',
    apellidos: u.apellidos ?? '',
  };
}

// Caché local sincronizada con PostgreSQL para funciones síncronas de otros módulos
let cacheUsuarios = (Array.isArray(seedUsuarios)
  ? seedUsuarios
  : seedUsuarios.usuarios || []
).map(sanitizarUsuario);

// Sincroniza la caché con PostgreSQL apenas carga la aplicación
fetch(`${API_URL}/usuarios`)
  .then((res) => (res.ok ? res.json() : null))
  .then((lista) => {
    if (Array.isArray(lista)) cacheUsuarios = lista.map(sanitizarUsuario);
  })
  .catch(() => {});

async function peticion(ruta, opciones = {}) {
  const res = await fetch(`${API_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    ...opciones,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.mensaje || 'Error al procesar la solicitud.');
    error.tipo = data.tipo || null;
    error.estado = data.estado || null;
    throw error;
  }
  return data;
}

// --- Funciones de compatibilidad con otros módulos (Préstamos / Devoluciones) ---

export function listarUsuariosPublicos() {
  return cacheUsuarios.map(({ claveHash, clave_hash, clave, ...publico }) => publico);
}

export function obtenerUsuarioPorId(id) {
  return listarUsuariosPublicos().find((u) => u.id === id) || null;
}

export function establecerDeuda(usuarioId, deuda) {
  cacheUsuarios = cacheUsuarios.map((u) =>
    u.id === usuarioId ? { ...u, deuda: deuda ?? null } : u
  );
  const sesion = obtenerSesion();
  if (sesion && sesion.id === usuarioId) {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ ...sesion, deuda: deuda ?? null }));
  }
  return cacheUsuarios.find((u) => u.id === usuarioId) || null;
}

export function actualizarEstadoUsuario(usuarioId, estado) {
  cacheUsuarios = cacheUsuarios.map((u) =>
    u.id === usuarioId ? { ...u, estado } : u
  );
  return cacheUsuarios.find((u) => u.id === usuarioId) || null;
}

// --- Funciones principales de HU-1 conectadas a PostgreSQL ---

export function obtenerSesion() {
  try {
    const raw = localStorage.getItem(CLAVE_SESION);
    return raw ? sanitizarUsuario(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function iniciarSesion(datos) {
  const data = await peticion('/auth/login', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  const usuarioLimpio = sanitizarUsuario(data.usuario);
  localStorage.setItem(CLAVE_SESION, JSON.stringify(usuarioLimpio));
  if (data.token) localStorage.setItem(CLAVE_TOKEN, data.token);
  return { ...data, usuario: usuarioLimpio };
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
  localStorage.removeItem(CLAVE_TOKEN);
}

export async function registrarEstudiante(datos) {
  const res = await peticion('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ ...datos, rol: 'estudiante' }),
  });
  if (res.usuario) {
    res.usuario = sanitizarUsuario(res.usuario);
    cacheUsuarios.unshift(res.usuario);
  }
  return res;
}

export async function registrarEncargado(datos) {
  const res = await peticion('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ ...datos, rol: 'encargado' }),
  });
  if (res.usuario) {
    res.usuario = sanitizarUsuario(res.usuario);
    cacheUsuarios.unshift(res.usuario);
  }
  return res;
}

export async function verificarCuenta(token) {
  const res = await peticion('/auth/verificar', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  return sanitizarUsuario(res);
}

export async function actualizarPerfil(id, datos) {
  const actualizado = sanitizarUsuario(
    await peticion(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    })
  );
  localStorage.setItem(CLAVE_SESION, JSON.stringify(actualizado));
  cacheUsuarios = cacheUsuarios.map((u) => (u.id === id ? actualizado : u));
  return actualizado;
}

export async function cambiarContrasena(id, datos) {
  return peticion(`/usuarios/${id}/contrasena`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}

export async function solicitarRecuperacion(correo) {
  return peticion('/auth/recuperar', {
    method: 'POST',
    body: JSON.stringify({ correo }),
  });
}

export async function revisarEnlaceRecuperacion(token) {
  return peticion(`/auth/recuperar/${token}`);
}

export async function restablecerContrasena(token, datos) {
  return peticion('/auth/restablecer', {
    method: 'POST',
    body: JSON.stringify({ token, ...datos }),
  });
}

export async function obtenerResumenPrestamos() {
  return { activos: 0, pendientes: 0, historial: 0, devueltos: 0, vencidos: 0 };
}