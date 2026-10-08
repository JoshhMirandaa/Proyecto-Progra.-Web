import React, { useState } from 'react';
import db from '../data/db.json';

const Devoluciones = () => {
  const [prestamosActivos, setPrestamosActivos] = useState(() => {
    return db.solicitudes.filter(solicitud => solicitud.estado === 'en_prestamo');
  });

  // Estado para controlar qué préstamo se está devolviendo
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  // Estados para el formulario de devolución
  const [estadoRetorno, setEstadoRetorno] = useState('Buen estado');
  const [observaciones, setObservaciones] = useState('');

  // Función para abrir el modal
  const abrirModalDevolucion = (prestamo) => {
    setPrestamoSeleccionado(prestamo);
    setMostrarModal(true);
  };

  // Función para cerrar el modal y limpiar el formulario
  const cerrarModal = () => {
    setMostrarModal(false);
    setPrestamoSeleccionado(null);
    setEstadoRetorno('Buen estado');
    setObservaciones('');
  };

  // Función para simular el guardado de la devolución
  const procesarDevolucion = (e) => {
    e.preventDefault(); // Evita que la página se recargue

    // Aquí (en la semana 9) simularemos que se actualiza el JSON.
    // En la semana 15, aquí harás el fetch() hacia tu backend (Node.js).
    
    // Filtramos la tabla para quitar el préstamo que acabamos de devolver
    const nuevosPrestamos = prestamosActivos.filter(
      p => p.id !== prestamoSeleccionado.id
    );
    setPrestamosActivos(nuevosPrestamos);
    
    // Requisito: "Toda operación de escritura notifica su resultado"
    alert(`Devolución registrada exitosamente. Estado: ${estadoRetorno}`);
    cerrarModal();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Gestión de Devoluciones</h2>
      <p>Aquí se muestran los equipos que están actualmente en préstamo y deben ser devueltos.</p>

      {prestamosActivos.length === 0 ? (
        <p>No hay equipos prestados en este momento.</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>ID Solicitud</th>
              <th style={{ padding: '8px' }}>Estudiante (ID)</th>
              <th style={{ padding: '8px' }}>Equipo (ID)</th>
              <th style={{ padding: '8px' }}>Fecha a Devolver</th>
              <th style={{ padding: '8px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamosActivos.map((prestamo) => (
              <tr key={prestamo.id}>
                <td style={{ padding: '8px' }}>{prestamo.id}</td>
                <td style={{ padding: '8px' }}>{prestamo.estudianteId}</td>
                <td style={{ padding: '8px' }}>{prestamo.equipoId}</td>
                <td style={{ padding: '8px' }}>{prestamo.fechaFin}</td>
                <td style={{ padding: '8px' }}>
                  <button onClick={() => abrirModalDevolucion(prestamo)}>
                    Registrar Devolución
                  </button>
                  <button style={{ marginLeft: '10px' }}>Renovar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- MODAL DE DEVOLUCIÓN --- */}
      {mostrarModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Registrar Devolución - {prestamoSeleccionado?.id}</h3>
            
            <form onSubmit={procesarDevolucion}>
              <div style={{ marginBottom: '15px' }}>
                <label>Estado en que retorna:</label>
                <select 
                  value={estadoRetorno} 
                  onChange={(e) => setEstadoRetorno(e.target.value)}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                >
                  <option value="Buen estado">Buen estado</option>
                  <option value="Faltan accesorios">Faltan accesorios</option>
                  <option value="Dañado">Dañado (Derivar a mantenimiento)</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Observaciones / Faltantes:</label>
                <textarea 
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                  rows="3"
                  placeholder="Detalle si hay raspones, cables faltantes, etc."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" style={{ backgroundColor: 'green', color: 'white' }}>
                  Confirmar Devolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos básicos para simular un modal flotante
const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center'
};
const modalContentStyle = {
  backgroundColor: 'white', padding: '20px', borderRadius: '8px',
  width: '400px', maxWidth: '90%'
};

export default Devoluciones;