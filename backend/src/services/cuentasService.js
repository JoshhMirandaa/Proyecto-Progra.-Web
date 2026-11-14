const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Adapta el registro de PostgreSQL al formato exacto que espera SesionContext.jsx
function formatearUsuarioFrontend(row) {
  const partes = (row.nombre || '').trim().split(' ');
  const mitad = Math.ceil(partes.length / 2);
  const nombres = partes.slice(0, mitad).join(' ') || row.nombre;
  const apellidos = partes.slice(mitad).join(' ') || '';

  return {
    id: row.id,
    rol: row.rol,
    nombre: row.nombre,
    nombres,
    apellidos,
    correo: row.correo,
    codigo: row.codigo,
    carrera: row.carrera,
    telefono: row.telefono,
    verificado: row.verificado,
    estado: row.estado,
    fechaRegistro: row.fecha_registro
  };
}

async function listarUsuarios() {
  const { rows } = await pool.query('SELECT * FROM usuarios ORDER BY fecha_registro DESC');
  return rows.map(formatearUsuarioFrontend);
}

async function iniciarSesion(correo, clave) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE LOWER(correo) = LOWER($1)', [correo.trim()]);
  const usuario = rows[0];

  if (!usuario) {
    const err = new Error('Correo o contraseña incorrectos.');
    err.status = 401;
    throw err;
  }

  const esBcrypt = usuario.clave_hash && usuario.clave_hash.startsWith('$2');
  const claveValida = esBcrypt
    ? await bcrypt.compare(clave, usuario.clave_hash)
    : usuario.clave_hash === clave;

  if (!claveValida) {
    const err = new Error('Correo o contraseña incorrectos.');
    err.status = 401;
    throw err;
  }

  if (usuario.estado === 'bloqueado' || usuario.estado === 'suspendido') {
    const err = new Error('Tu cuenta se encuentra bloqueada. Contacta al administrador.');
    err.estado = 'bloqueado';
    err.status = 403;
    throw err;
  }

  if (!usuario.verificado) {
    const err = new Error('Debes verificar tu cuenta desde el enlace antes de iniciar sesión.');
    err.estado = 'no_verificado';
    err.status = 403;
    throw err;
  }

  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol, correo: usuario.correo },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    usuario: formatearUsuarioFrontend(usuario),
    token
  };
}

async function registrarUsuario(datos) {
  const correoLimpio = (datos.correo || '').trim().toLowerCase();
  const existe = await pool.query('SELECT id FROM usuarios WHERE LOWER(correo) = $1', [correoLimpio]);

  if (existe.rows.length > 0) {
    const err = new Error('Ya existe una cuenta registrada con este correo.');
    err.tipo = 'duplicado';
    err.status = 409;
    throw err;
  }

  const rolFinal = (datos.rol || 'estudiante').toLowerCase();
  const estadoInicial = rolFinal === 'encargado' ? 'pendiente_aprobacion' : 'activo';
  const id = `US-${Date.now().toString().slice(-6)}`;
  const nombreCompleto = datos.nombre || `${datos.nombres || ''} ${datos.apellidos || ''}`.trim();
  const clavePlana = datos.contrasena || datos.clave || '12345678';

  const salt = await bcrypt.genSalt(10);
  const claveHash = await bcrypt.hash(clavePlana, salt);

  const query = `
    INSERT INTO usuarios (id, rol, nombre, correo, codigo, carrera, telefono, clave_hash, verificado, estado)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
    RETURNING *;
  `;

  const valores = [
    id,
    rolFinal,
    nombreCompleto,
    correoLimpio,
    datos.codigo || null,
    datos.carrera || null,
    datos.telefono || null,
    claveHash,
    estadoInicial
  ];

  const { rows } = await pool.query(query, valores);

  // Guardamos token de verificación en codigos_verificacion
  const tokenVerificacion = `VER-${Date.now()}`;
  await pool.query(
    `INSERT INTO codigos_verificacion (correo, codigo, tipo, expira_en, usado)
     VALUES ($1, $2, 'registro', NOW() + INTERVAL '24 hours', FALSE)`,
    [correoLimpio, tokenVerificacion]
  );

  return {
    usuario: formatearUsuarioFrontend(rows[0]),
    enlacePrueba: `/verificar?token=${tokenVerificacion}`
  };
}

async function verificarCuenta(token) {
  const { rows } = await pool.query(
    `SELECT * FROM codigos_verificacion WHERE codigo = $1 AND tipo = 'registro' AND usado = FALSE AND expira_en > NOW()`,
    [token]
  );

  if (rows.length === 0) {
    throw new Error('El enlace de verificación no es válido o ya expiró.');
  }

  const registro = rows[0];
  await pool.query('UPDATE codigos_verificacion SET usado = TRUE WHERE id = $1', [registro.id]);

  const userRes = await pool.query(
    'UPDATE usuarios SET verificado = TRUE WHERE LOWER(correo) = LOWER($1) RETURNING *',
    [registro.correo]
  );

  return formatearUsuarioFrontend(userRes.rows[0]);
}

async function actualizarPerfil(id, datos) {
  const nombreCompleto =
    datos.nombre || (datos.nombres ? `${datos.nombres} ${datos.apellidos || ''}`.trim() : null);

  // Soporta telefono, celular o numeroContacto según cómo lo envíe MiCuenta.jsx
  const telefonoNuevo =
    datos.telefono ?? datos.celular ?? datos.numero ?? datos.telefonoContacto ?? null;

  const query = `
    UPDATE usuarios
    SET nombre = COALESCE($1, nombre),
        telefono = COALESCE($2, telefono),
        carrera = COALESCE($3, carrera)
    WHERE id = $4
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    nombreCompleto,
    telefonoNuevo,
    datos.carrera || null,
    id
  ]);
  if (rows.length === 0) throw new Error('Usuario no encontrado.');
  return formatearUsuarioFrontend(rows[0]);
}

async function cambiarContrasena(id, datos) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
  const usuario = rows[0];
  if (!usuario) throw new Error('Usuario no encontrado.');

  const actual = datos.contrasenaActual || datos.actual;
  const nueva = datos.nuevaContrasena || datos.nueva;

  const esBcrypt = usuario.clave_hash && usuario.clave_hash.startsWith('$2');
  const valida = esBcrypt ? await bcrypt.compare(actual, usuario.clave_hash) : usuario.clave_hash === actual;
  if (!valida) throw new Error('La contraseña actual es incorrecta.');

  const salt = await bcrypt.genSalt(10);
  const hashNuevo = await bcrypt.hash(nueva, salt);
  await pool.query('UPDATE usuarios SET clave_hash = $1 WHERE id = $2', [hashNuevo, id]);
  return { ok: true };
}

async function solicitarRecuperacion(correo) {
  const correoLimpio = (correo || '').trim().toLowerCase();
  const { rows } = await pool.query('SELECT id FROM usuarios WHERE LOWER(correo) = $1', [correoLimpio]);
  if (rows.length === 0) throw new Error('No existe una cuenta registrada con ese correo.');

  const token = `REC-${Date.now()}`;
  await pool.query(
    `INSERT INTO codigos_verificacion (correo, codigo, tipo, expira_en, usado)
     VALUES ($1, $2, 'recuperacion', NOW() + INTERVAL '1 hour', FALSE)`,
    [correoLimpio, token]
  );

  return { enlacePrueba: `/restablecer?token=${token}` };
}

async function revisarEnlaceRecuperacion(token) {
  const { rows } = await pool.query(
    `SELECT correo FROM codigos_verificacion WHERE codigo = $1 AND tipo = 'recuperacion' AND usado = FALSE AND expira_en > NOW()`,
    [token]
  );
  if (rows.length === 0) throw new Error('El enlace de recuperación es inválido o ya expiró.');
  return { correo: rows[0].correo };
}

async function restablecerContrasena(token, datos) {
  const { rows } = await pool.query(
    `SELECT * FROM codigos_verificacion WHERE codigo = $1 AND tipo = 'recuperacion' AND usado = FALSE AND expira_en > NOW()`,
    [token]
  );
  if (rows.length === 0) throw new Error('El enlace de recuperación es inválido o ya expiró.');

  const nueva = datos.contrasena || datos.nuevaContrasena;
  const salt = await bcrypt.genSalt(10);
  const hashNuevo = await bcrypt.hash(nueva, salt);

  await pool.query('UPDATE usuarios SET clave_hash = $1 WHERE LOWER(correo) = LOWER($2)', [hashNuevo, rows[0].correo]);
  await pool.query('UPDATE codigos_verificacion SET usado = TRUE WHERE id = $1', [rows[0].id]);
  return { ok: true };
}

module.exports = {
  listarUsuarios,
  iniciarSesion,
  registrarUsuario,
  verificarCuenta,
  actualizarPerfil,
  cambiarContrasena,
  solicitarRecuperacion,
  revisarEnlaceRecuperacion,
  restablecerContrasena
};