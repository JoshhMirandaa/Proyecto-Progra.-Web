import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MarcoEncargado } from './components/layout/MarcoEncargado.jsx'
import { MarcoEstudiante } from './components/layout/MarcoEstudiante.jsx'
import { MarcoPublico } from './components/layout/MarcoPublico.jsx'
import { Notificaciones } from './components/ui/Notificaciones.jsx'
import { CatalogoProvider } from './context/CatalogoContext.jsx'
import { InventarioProvider } from './context/InventarioContext.jsx'
import { NotificacionProvider } from './context/NotificacionContext.jsx'
import { ReservaProvider } from './context/ReservaContext.jsx'
import { SesionProvider, useSesion } from './context/SesionContext.jsx'
import { Catalogo } from './pages/Catalogo.jsx'
import { DetalleEquipoCatalogo } from './pages/DetalleEquipoCatalogo.jsx'
import { EquipoDetalle } from './pages/EquipoDetalle.jsx'
import { EquipoFormulario } from './pages/EquipoFormulario.jsx'
import { FichaPublica } from './pages/FichaPublica.jsx'
import { InventarioLista } from './pages/InventarioLista.jsx'
import { NoEncontrado, PendienteDeOtraHistoria } from './pages/Marcadores.jsx'
import { MisSolicitudes } from './pages/MisSolicitudes.jsx'
import { ListaEspera, MisReservas, Reservas } from './pages/Reservas.jsx'
import { SolicitudFormulario } from './pages/SolicitudFormulario.jsx'
import Devoluciones from './pages/devoluciones.jsx'
import './styles/base.css'
import './styles/layout.css'
import './styles/componentes.css'
import './styles/reservas.css'
import './styles/catalogo.css'

/** Vistas del panel del encargado (HU-2). */
function Panel({ children }) {
  return <MarcoEncargado>{children}</MarcoEncargado>
}

/** Vistas públicas: la ficha del equipo que consume el catálogo de la HU-3. */
function Publico({ children }) {
  return <MarcoPublico>{children}</MarcoPublico>
}

/** Vistas del estudiante (HU-3): catálogo, detalle, solicitud y mis solicitudes. */
function Estudiante({ children }) {
  return <MarcoEstudiante>{children}</MarcoEstudiante>
}

/** Vistas que comparten encargado y estudiante: el marco depende del rol en sesión. */
function SegunRol({ children }) {
  const { esEncargado } = useSesion()
  return esEncargado ? <Panel>{children}</Panel> : <Estudiante>{children}</Estudiante>
}

/** La página de inicio depende del rol: el encargado va al inventario y el resto al catálogo. */
function Inicio() {
  const { esEncargado } = useSesion()
  return <Navigate to={esEncargado ? '/inventario' : '/catalogo'} replace />
}

/** Ficha del equipo: el estudiante ve la vista 3.2; el visitante y el encargado, la 2.6. */
function DetalleSegunRol() {
  const { esEstudiante } = useSesion()
  return esEstudiante ? (
    <Estudiante>
      <DetalleEquipoCatalogo />
    </Estudiante>
  ) : (
    <Publico>
      <FichaPublica />
    </Publico>
  )
}

const OTRAS_HISTORIAS = [
  {
    ruta: '/solicitudes',
    titulo: 'Bandeja de solicitudes',
    historia: 'HU-4 — Aprobación y entrega',
  },
  { ruta: '/prestamos', titulo: 'Préstamos vigentes', historia: 'HU-4 — Aprobación y entrega' },
  { ruta: '/vencidos', titulo: 'Préstamos vencidos', historia: 'HU-4 — Aprobación y entrega' },
  { ruta: '/tablero', titulo: 'Tablero', historia: 'HU-7 — Métricas y usuarios' },
  { ruta: '/usuarios', titulo: 'Usuarios', historia: 'HU-7 — Métricas y usuarios' },
]

export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <NotificacionProvider>
          <InventarioProvider>
            <ReservaProvider>
              <CatalogoProvider>
                <Routes>
                  <Route path="/" element={<Inicio />} />

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
                    path="/reservas"
                    element={
                      <SegunRol>
                        <Reservas />
                      </SegunRol>
                    }
                  />
                  <Route
                    path="/mis-reservas"
                    element={
                      <SegunRol>
                        <MisReservas />
                      </SegunRol>
                    }
                  />
                  <Route
                    path="/lista-espera"
                    element={
                      <Panel>
                        <ListaEspera />
                      </Panel>
                    }
                  />

                  <Route
                    path="/catalogo"
                    element={
                      <Estudiante>
                        <Catalogo />
                      </Estudiante>
                    }
                  />
                  <Route path="/catalogo/:equipoId" element={<DetalleSegunRol />} />
                  <Route
                    path="/catalogo/:equipoId/solicitar"
                    element={
                      <Estudiante>
                        <SolicitudFormulario />
                      </Estudiante>
                    }
                  />
                  <Route
                    path="/mis-solicitudes"
                    element={
                      <Estudiante>
                        <MisSolicitudes />
                      </Estudiante>
                    }
                  />
                  <Route
                    path="/mi-deuda"
                    element={
                      <SegunRol>
                        <PendienteDeOtraHistoria titulo="Mi deuda" historia="HU-5 — Devoluciones" />
                      </SegunRol>
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
                      <SegunRol>
                        <NoEncontrado />
                      </SegunRol>
                    }
                  />
                </Routes>
                <Notificaciones />
              </CatalogoProvider>
            </ReservaProvider>
          </InventarioProvider>
        </NotificacionProvider>
      </SesionProvider>
    </BrowserRouter>
  )
}
