const db = require('../config/db');

// 1. Obtener solicitudes con filtros de estado y equipo para las pestañas
const obtenerSolicitudes = async (req, res) => {
  try {
    const { estado, equipoId } = req.query;
    
    let query = `
      SELECT s.*, 
             u.codigo_inventario as codigo_unidad
      FROM solicitudes s
      LEFT JOIN unidades u ON s.unidad_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro por estado (pendiente, aprobada, rechazada, en_prestamo, etc.)
    if (estado && estado !== 'todos') {
      params.push(estado);
      query += ` AND s.estado = $${params.length}`;
    }

    // Filtro por equipo
    if (equipoId && equipoId !== 'todos') {
      params.push(equipoId);
      query += ` AND s.equipo_id = $${params.length}`;
    }

    query += ' ORDER BY s.fecha_solicitud DESC';
    const { rows } = await db.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener la bandeja de solicitudes' });
  }
};

// 2. Resolver solicitud (Aprobar o Rechazar)
const resolverSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { accion, unidadId, motivoRechazo } = req.body;

    if (accion === 'aprobar') {
      const query = `
        UPDATE solicitudes 
        SET estado = 'aprobada', unidad_id = $1 
        WHERE id = $2 
        RETURNING *;
      `;
      const { rows } = await db.query(query, [unidadId || 1, id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
      return res.json({ mensaje: 'Solicitud aprobada con éxito', solicitud: rows[0] });
    } 
    
    if (accion === 'rechazar') {
      const query = `
        UPDATE solicitudes 
        SET estado = 'rechazada', motivo_rechazo = $1 
        WHERE id = $2 
        RETURNING *;
      `;
      const { rows } = await db.query(query, [motivoRechazo || 'No especificado', id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
      return res.json({ mensaje: 'Solicitud rechazada con éxito', solicitud: rows[0] });
    }

    res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('Error al resolver solicitud:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

// 3. Registrar entrega de un equipo aprobado
const registrarEntrega = async (req, res) => {
  try {
    const { solicitudId, accesoriosEntregados, observaciones } = req.body;

    // Actualizamos el estado de la solicitud a 'en_prestamo' (o 'entregado')
    const querySolicitud = `
      UPDATE solicitudes 
      SET estado = 'en_prestamo' 
      WHERE id = $1 
      RETURNING *;
    `;
    const { rows } = await db.query(querySolicitud, [solicitudId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

    res.json({ mensaje: 'Entrega registrada correctamente', entrega: rows[0] });
  } catch (error) {
    console.error('Error al registrar entrega:', error);
    res.status(500).json({ error: 'Error al registrar la entrega' });
  }
};

// 4. Listar préstamos vigentes
const obtenerPrestamosVigentes = async (req, res) => {
  try {
    const query = `
      SELECT s.*, 
             u.codigo_inventario as codigo_unidad
      FROM solicitudes s
      LEFT JOIN unidades u ON s.unidad_id = u.id
      WHERE s.estado IN ('aprobada', 'en_prestamo', 'entregado')
      ORDER BY s.fecha_solicitud DESC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener préstamos vigentes:', error);
    res.status(500).json({ error: 'Error al obtener los préstamos vigentes' });
  }
};

module.exports = {
  obtenerSolicitudes,
  resolverSolicitud,
  registrarEntrega,
  obtenerPrestamosVigentes
};