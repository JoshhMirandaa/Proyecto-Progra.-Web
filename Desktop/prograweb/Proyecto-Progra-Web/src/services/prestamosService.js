const API_URL = 'http://localhost:3000/api';

export async function listarBandeja(filtros = {}) {
  try {
    // 1. Pedimos TODAS las solicitudes a la BD para calcular bien los contadores globales
    const resTodas = await fetch(`${API_URL}/solicitudes`);
    const todasLasSolicitudes = resTodas.ok ? await resTodas.json() : [];

    // 2. Pedimos las solicitudes filtradas para la tabla principal
    const params = new URLSearchParams();
    if (filtros.estado && filtros.estado !== 'todos') params.append('estado', filtros.estado);
    if (filtros.equipoId && filtros.equipoId !== 'todos') params.append('equipoId', filtros.equipoId);

    const response = await fetch(`${API_URL}/solicitudes?${params.toString()}`);
    const solicitudesDb = response.ok ? await response.json() : [];

    // Mapeo de la tabla filtrada
    const listaFinal = solicitudesDb.map(s => ({
      id: s.id,
      estudianteId: s.estudiante_id,
      estudianteNombre: `Estudiante #${s.estudiante_id}`,
      estudianteDetalle: 'Ingeniería',
      estudianteCodigo: `2023${s.estudiante_id}`,
      deudaEstudiante: 0,
      equipoNombre: `Equipo ID: ${s.equipo_id}`,
      cursoNombre: 'Laboratorio Académico',
      fechaInicio: s.fecha_solicitud,
      fechaFin: s.fecha_solicitud,
      codigoUnidad: s.codigo_unidad || 'INV-001',
      motivo: s.motivo_rechazo || 'Préstamo de equipo.',
      antiguedad: 'Reciente',
      estado: s.estado,
      codigoPrestamo: `P-${s.id}`,
      creadaEn: s.fecha_solicitud
    }));

    // 3. Calculamos los contadores basándonos en la lista completa (todasLasSolicitudes)
    const contadores = {
      pendiente: todasLasSolicitudes.filter(s => s.estado === 'pendiente').length,
      aprobada: todasLasSolicitudes.filter(s => s.estado === 'aprobada').length,
      en_prestamo: todasLasSolicitudes.filter(s => s.estado === 'en_prestamo' || s.estado === 'entregado').length,
      rechazada: todasLasSolicitudes.filter(s => s.estado === 'rechazada').length,
      todos: todasLasSolicitudes.length
    };

    return {
      solicitudes: listaFinal,
      total: listaFinal.length,
      desde: listaFinal.length > 0 ? 1 : 0,
      hasta: listaFinal.length,
      pagina: 1,
      totalPaginas: 1,
      contadores,
      deuda: { estudiantes: 0, monto: 0 },
      equipos: [{ id: 1, nombre: 'Cámara Canon' }, { id: 2, nombre: 'Kit de robótica' }]
    };
  } catch (error) {
    console.error(error);
    return { solicitudes: [], total: 0, contadores: { pendiente: 0, aprobada: 0, en_prestamo: 0, rechazada: 0, todos: 0 } };
  }
}

export async function obtenerContadores() {
  try {
    const response = await fetch(`${API_URL}/solicitudes`);
    if (!response.ok) return { pendientes: 0, vigentes: 0, vencidos: 0, vencenHoy: 0 };
    const solicitudes = await response.json();
    return {
      pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
      vigentes: solicitudes.filter(s => s.estado === 'entregado' || s.estado === 'en_prestamo').length,
      vencidos: 0,
      vencenHoy: 0
    };
  } catch (e) {
    return { pendientes: 0, vigentes: 0, vencidos: 0, vencenHoy: 0 };
  }
}

export async function obtenerOpcionesAprobacion(id) {
  return {
    solicitud: { id, equipoId: 1, fechaInicio: new Date(), fechaFin: new Date() },
    unidadesLibres: [{ id: 1, codigoInventario: 'INV-OSC-0042', ubicacion: 'Almacén H-102' }],
    proximoRango: null,
    requiereAutorizacion: false
  };
}

export async function aprobarSolicitud(id, datosAprobacion, encargado) {
  const response = await fetch(`${API_URL}/solicitudes/${id}/resolver`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'aprobar', unidadId: datosAprobacion.unidadId || 1 })
  });
  const resultado = await response.json();
  if (!response.ok) throw new Error(resultado.error || 'Error al aprobar');
  return { codigoUnidad: 'INV-OSC-0042', estudianteNombre: 'Estudiante' };
}

export async function rechazarSolicitud(id, datosRechazo, encargado) {
  const response = await fetch(`${API_URL}/solicitudes/${id}/resolver`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'rechazar', motivoRechazo: datosRechazo.motivo || 'Motivo no especificado' })
  });
  const resultado = await response.json();
  if (!response.ok) throw new Error(resultado.error || 'Error al rechazar');
  return { estudianteNombre: 'Estudiante' };
}

export async function obtenerParaEntrega(id) {
  return {
    solicitud: { id, equipoId: 1, unidadId: 1, fechaFin: new Date() },
    accesorios: ['Cable de poder', 'Maletín', 'Manual'],
    penalidadPorDia: 15,
    codigoPropuesto: 'PRES-001'
  };
}

export async function registrarEntrega(id, datosEntrega, encargado) {
  const response = await fetch(`${API_URL}/entregas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solicitudId: id, accesoriosEntregados: 'Completos', observaciones: 'OK' })
  });
  const resultado = await response.json();
  if (!response.ok) throw new Error(resultado.error || 'Error al registrar entrega');
  return { codigoPrestamo: resultado.entrega?.id || 'PRES-001' };
}

export async function obtenerConstancia(codigo, usuario) {
  return { id: codigo, equipoNombreCompleto: 'Cámara Canon EOS 90D', detalleAccesorios: [] };
}

export async function listarVigentes() {
  try {
    const response = await fetch(`${API_URL}/prestamos/vigentes`);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    return [];
  }
}