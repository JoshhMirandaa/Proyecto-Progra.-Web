const API_URL = 'http://localhost:3000/api';

// 1. Obtener la lista de solicitudes desde el backend
export const fetchSolicitudes = async () => {
  try {
    const response = await fetch(`${API_URL}/solicitudes`);
    if (!response.ok) throw new Error('Error al obtener solicitudes');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// 2. Aprobar o rechazar una solicitud
export const resolverSolicitudAPI = async (id, datos) => {
  try {
    const response = await fetch(`${API_URL}/solicitudes/${id}/resolver`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return await response.json();
  } catch (error) {
    console.error('Error al resolver solicitud:', error);
  }
};

// 3. Registrar la entrega del equipo
export const registrarEntregaAPI = async (datosEntrega) => {
  try {
    const response = await fetch(`${API_URL}/entregas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosEntrega)
    });
    return await response.json();
  } catch (error) {
    console.error('Error al registrar entrega:', error);
  }
};