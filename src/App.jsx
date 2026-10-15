import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MarcoEncargado } from './components/layout/MarcoEncargado.jsx'
import { MarcoPublico } from './components/layout/MarcoPublico.jsx'
import { Notificaciones } from './components/ui/Notificaciones.jsx'
import { InventarioProvider } from './context/InventarioContext.jsx'
import { NotificacionProvider } from './context/NotificacionContext.jsx'
import { SesionProvider } from './context/SesionContext.jsx'
import { EquipoDetalle } from './pages/EquipoDetalle.jsx'
import { EquipoFormulario } from './pages/EquipoFormulario.jsx'
import { FichaPublica } from './pages/FichaPublica.jsx'
import { InventarioLista } from './pages/InventarioLista.jsx'
import { NoEncontrado, PendienteDeOtraHistoria } from './pages/Marcadores.jsx'
import Devoluciones from './pages/devoluciones.jsx'
import './styles/base.css'
import './styles/layout.css'
import './styles/componentes.css'

/** Vistas del panel del encargado (HU-2). */
function Panel({ children }) {
  return <MarcoEncargado>{children}</MarcoEncargado>
}

/** Vistas públicas: la ficha del equipo que consume el catálogo de la HU-3. */
function Publico({ children }) {
  return <MarcoPublico>{children}</MarcoPublico>
}

const OTRAS_HISTORIAS = [
  { ruta: '/solicitudes', titulo: 'Solicitudes', historia: 'HU-3 — Catálogo y solicitud' },
  { ruta: '/prestamos', titulo: 'Préstamos vigentes', historia: 'HU-4 — Aprobación y entrega' },
  { ruta: '/vencidos', titulo: 'Préstamos vencidos', historia: 'HU-4 — Aprobación y entrega' },
  { ruta: '/reservas', titulo: 'Reservas', historia: 'HU-6 — Reserva anticipada' },
  { ruta: '/lista-espera', titulo: 'Lista de espera', historia: 'HU-6 — Reserva anticipada' },
  { ruta: '/tablero', titulo: 'Tablero', historia: 'HU-7 — Métricas y usuarios' },
  { ruta: '/usuarios', titulo: 'Usuarios', historia: 'HU-7 — Métricas y usuarios' },
]

export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <NotificacionProvider>
          <InventarioProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/inventario" replace />} />

              <Route
                path="/inventario"
                element={
                  <Panel>
                    <InventarioLista />
                  </Panel>
                }
              />
              <Route
                path="/inventario/nuevo"
                element={
                  <Panel>
                    <EquipoFormulario />
                  </Panel>
                }
              />
              <Route
                path="/inventario/:equipoId"
                element={
                  <Panel>
                    <EquipoDetalle />
                  </Panel>
                }
              />
              <Route
                path="/inventario/:equipoId/editar"
                element={
                  <Panel>
                    <EquipoFormulario />
                  </Panel>
                }
              />

              <Route
                path="/devoluciones"
                element={
                  <Panel>
                    <Devoluciones />
                  </Panel>
                }
              />

              <Route
                path="/catalogo/:equipoId"
                element={
                  <Publico>
                    <FichaPublica />
                  </Publico>
                }
              />

              {OTRAS_HISTORIAS.map(({ ruta, titulo, historia }) => (
                <Route
                  key={ruta}
                  path={ruta}
                  element={
                    <Panel>
                      <PendienteDeOtraHistoria titulo={titulo} historia={historia} />
                    </Panel>
                  }
                />
              ))}

              <Route
                path="*"
                element={
                  <Panel>
                    <NoEncontrado />
                  </Panel>
                }
              />
            </Routes>
            <Notificaciones />
          </InventarioProvider>
        </NotificacionProvider>
      </SesionProvider>
    </BrowserRouter>
  )
}
