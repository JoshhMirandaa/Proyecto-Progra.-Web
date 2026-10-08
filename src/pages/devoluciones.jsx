import React, { useState } from 'react';
import db from '../data/db.json';

const Devoluciones = () => {
  const [prestamosActivos, setPrestamosActivos] = useState(() => {
    return db.solicitudes.filter(solicitud => solicitud.estado === 'en_prestamo');
  });

  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [estadoRetorno, setEstadoRetorno] = useState('Buen estado');
  const [observaciones, setObservaciones] = useState('');
  
  // Nuevos estados para manejar el retraso calculado
  const [diasRetraso, setDiasRetraso] = useState(0);
  const [penalidad, setPenalidad] = useState(0);

  // Función para calcular días entre la fecha pactada y hoy
  const calcularRetraso = (fechaFin) => {
    const fechaPactada = new Date(fechaFin);
    const fechaHoy = new Date(); // Toma la fecha actual del sistema
    
    // Restamos las fechas (el resultado da en milisegundos)
    const diferenciaMilisegundos = fechaHoy.getTime() - fechaPactada.getTime();
    
    // Convertimos de milisegundos a días usando Math.ceil para redondear hacia arriba
    const diferenciaDias = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
    
    return diferenciaDias > 0 ? diferenciaDias : 0;
  };

  const abrirModalDevolucion = (prestamo) => {
    setPrestamoSeleccionado(prestamo);
    
    // Calculamos el retraso al abrir el modal
    const retraso = calcularRetraso(prestamo.fechaFin);
    setDiasRetraso(retraso);
    // Simulamos que la penalidad son 5 soles por cada día de retraso
    setPenalidad(retraso * 5); 

    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setPrestamoSeleccionado(null);
    setEstadoRetorno('Buen estado');
    setObservaciones('');
    setDiasRetraso(0);
    setPenalidad(0);
  };

  const procesarDevolucion = (e) => {
    e.preventDefault();

    const nuevosPrestamos = prestamosActivos.filter(
      p => p.id !== prestamoSeleccionado.id
    );
    setPrestamosActivos(nuevosPrestamos);
    
    alert(`Devolución completada. Estado: ${estadoRetorno}. Retraso: ${diasRetraso} días. Penalidad: S/ ${penalidad}`);
    cerrarModal();
  };

  //----------------------------------------------
  const procesarRenovacion = (prestamo) => {
    
    const equipo = db.equipos.find(eq => eq.id === prestamo.equipoId);

    if (!equipo) {
      alert("Error: No se encontró el equipo.");
      return;
    }

    
    if (equipo.admiteRenovacion === false) {
      
      alert(`No se puede renovar. El equipo "${equipo.nombre}" no admite renovaciones.`);
      return;
    }

    
    const confirmar = window.confirm(`¿Deseas renovar el préstamo del equipo ${equipo.nombre}?`);
    
    if (confirmar) {
      alert("Renovación exitosa. Se extendió el tiempo del préstamo.");
      
    }
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
                  <button 
                    style={{ marginLeft: '10px' }} 
                    onClick={() => procesarRenovacion(prestamo)}
                  >
                    Renovar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mostrarModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Registrar Devolución - {prestamoSeleccionado?.id}</h3>
            
            <div style={{ backgroundColor: '#fff3cd', padding: '10px', marginBottom: '15px', borderRadius: '5px' }}>
              <strong>Días de retraso:</strong> {diasRetraso} <br/>
              <strong>Penalidad generada:</strong> S/ {penalidad}
            </div>

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