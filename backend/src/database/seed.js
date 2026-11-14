const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function poblarUsuarios() {
  try {
    const rutaSeed = path.join(
      __dirname,
      '../../../src/data/seed-usuarios.json'
    );

    const contenido = fs.readFileSync(rutaSeed, 'utf-8');
    const data = JSON.parse(contenido);

    const usuarios = Array.isArray(data)
      ? data
      : data.usuarios || Object.values(data).find(Array.isArray) || [];

    console.log(`Leyendo ${usuarios.length} usuarios desde seed-usuarios.json...`);

    for (const u of usuarios) {
      const nombreCompleto =
        u.nombre ||
        u.nombreCompleto ||
        [u.nombres, u.apellidos].filter(Boolean).join(' ').trim() ||
        'Usuario Sin Nombre';

      const correo = u.correo || u.email;
      const rolNormalizado = (u.rol || 'estudiante').toLowerCase();
      const estadoNormalizado = (u.estado || 'activo').toLowerCase();

      const query = `
        INSERT INTO usuarios (
          id, rol, nombre, correo, codigo, carrera, telefono, clave_hash, verificado, estado, fecha_registro
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (correo) DO NOTHING;
      `;

      const valores = [
        u.id,
        rolNormalizado,
        nombreCompleto,
        correo,
        u.codigo || u.codigoAlumno || null,
        u.carrera || null,
        u.telefono || u.celular || null,
        u.claveHash || u.clave_hash || u.contrasenaHash || u.clave || '123456',
        u.verificado !== undefined ? u.verificado : true,
        estadoNormalizado,
        u.fechaRegistro || u.fecha_registro || new Date().toISOString()
      ];

      await pool.query(query, valores);
    }

    console.log('Precarga de usuarios completada en PostgreSQL.');
  } catch (error) {
    console.error('Error al ejecutar el seed:', error.message);
  } finally {
    await pool.end();
  }
}

poblarUsuarios();