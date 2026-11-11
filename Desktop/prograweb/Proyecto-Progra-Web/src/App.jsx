import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RutaProtegida } from './components/cuenta/RutaProtegida.jsx'
import { MarcoEncargado } from './components/layout/MarcoEncargado.jsx'
import { MarcoPublico } from './components/layout/MarcoPublico.jsx'
import { MarcoSegunRol } from './components/layout/MarcoSegunRol.jsx'
import { Notificaciones } from './components/ui/Notificaciones.jsx'
import { CatalogoProvider } from './context/CatalogoContext.jsx'
import { InventarioProvider } from './context/InventarioContext.jsx'
import { NotificacionProvider } from './context/NotificacionContext.jsx'
import { DevolucionesProvider } from './context/DevolucionesContext.jsx'
import { PrestamosProvider } from './context/PrestamosContext.jsx'
import { ReservaProvider } from './context/ReservaContext.jsx'
import { SesionProvider, useSesion } from './context/SesionContext.jsx'
import { INICIO_POR_ROL, destinoTrasIngresar } from './domain/cuentas.js'
import { BandejaSolicitudes } from './pages/BandejaSolicitudes.jsx'
import { Catalogo } from './pages/Catalogo.jsx'
import { ConstanciaEntrega } from './pages/ConstanciaEntrega.jsx'
import { HistorialEstudiante } from './pages/HistorialEstudiante.jsx'
import { DetalleEquipoCatalogo } from './pages/DetalleEquipoCatalogo.jsx'
import { EquipoDetalle } from './pages/EquipoDetalle.jsx'
import { EquipoFormulario } from './pages/EquipoFormulario.jsx'
import { FichaPublica } from './pages/FichaPublica.jsx'
import { IniciarSesion } from './pages/IniciarSesion.jsx'
import { Inicio } from './pages/Inicio.jsx'
import { InventarioLista } from './pages/InventarioLista.jsx'
import { PendienteDeOtraHistoria } from './pages/Marcadores.jsx'
import { MiCuenta } from './pages/MiCuenta.jsx'
import { MisSolicitudes } from './pages/MisSolicitudes.jsx'
import { PaginaNoEncontrada } from './pages/PaginaNoEncontrada.jsx'
import { PrestamosVigentes } from './pages/PrestamosVigentes.jsx'
import { RecuperarAcceso } from './pages/RecuperarAcceso.jsx'
import { RegistrarDevolucion } from './pages/RegistrarDevolucion.jsx'
import { RegistrarEntrega } from './pages/RegistrarEntrega.jsx'
import { RegistroEncargado } from './pages/RegistroEncargado.jsx'
import { RegistroEstudiante } from './pages/RegistroEstudiante.jsx'
import { ListaEspera, MisReservas, Reservas } from './pages/Reservas.jsx'
import { RestablecerContrasena } from './pages/RestablecerContrasena.jsx'
import { SolicitudFormulario } from './pages/SolicitudFormulario.jsx'
import { VerificarCuenta } from './pages/VerificarCuenta.jsx'
import './styles/base.css'
import './styles/layout.css'
import './styles/componentes.css'
import './styles/reservas.css'
import './styles/catalogo.css'
import './styles/cuenta.css'
import './styles/prestamos.css'
import './styles/devoluciones.css'

const ENCARGADO = ['encargado']
const ESTUDIANTE = ['estudiante']

/** Vista solo para el encargado (HU-2, HU-4, HU-5, HU-7), dentro de su panel. */
function Encargado({ children }) {
  return (
    <RutaProtegida roles={ENCARGADO}>
      <MarcoEncargado>{children}</MarcoEncargado>
    </RutaProtegida>
  )
}

/** Vista solo para el estudiante (HU-3). */
function Estudiante({ children }) {
  return (
    <RutaProtegida roles={ESTUDIANTE}>
      <MarcoSegunRol>{children}</MarcoSegunRol>
    </RutaProtegida>
  )
}

/** Vista para cualquier usuario con sesión; el marco depende del rol. */
function ConSesion({ children }) {
  return (
    <RutaProtegida>
      <MarcoSegunRol>{children}</MarcoSegunRol>
    </RutaProtegida>
  )
}

/** Inicio de sesión, registro y recuperación: con sesión abierta no tiene sentido verlas. */
function SoloVisitante({ children }) {
  const { conSesion, rol } = useSesion()
  const { state } = useLocation()
  if (conSesion) return <Navigate to={destinoTrasIngresar(state?.desde, rol)} replace />
  return <MarcoPublico>{children}</MarcoPublico>
}

/** La raíz: el visitante ve la portada; con sesión, cada rol va a su inicio. */
function Raiz() {
  const { conSesion, rol } = useSesion()
  if (conSesion) return <Navigate to={INICIO_POR_ROL[rol] ?? '/catalogo'} replace />
  return (
    <MarcoPublico>
      <Inicio />
    </MarcoPublico>
  )
}

/** Ficha del equipo: el estudiante ve la vista 3.2; el visitante y el encargado, la 2.6. */
function DetalleSegunRol() {
  const { esEstudiante } = useSesion()
  return (
    <MarcoSegunRol>{esEstudiante ? <DetalleEquipoCatalogo /> : <FichaPublica />}</MarcoSegunRol>
  )
}

const OTRAS_HISTORIAS = [
  { ruta: '/tablero', titulo: 'Tablero', historia: 'HU-7 — Métricas y usuarios' },
  { ruta: '/usuarios', titulo: 'Usuarios', historia: 'HU-7 — Métricas y usuarios' },
]

const PUBLICAS = [
  { ruta: '/login', vista: <IniciarSesion /> },
  { ruta: '/registro', vista: <RegistroEstudiante /> },
  { ruta: '/registro-encargado', vista: <RegistroEncargado /> },
  { ruta: '/recuperar', vista: <RecuperarAcceso /> },
  { ruta: '/restablecer', vista: <RestablecerContrasena /> },
]

export default function App() {
  return (
    <BrowserRouter>
      <NotificacionProvider>
        <SesionProvider>
          <InventarioProvider>
            <ReservaProvider>
              <CatalogoProvider>
                <PrestamosProvider>
                  <DevolucionesProvider>
                    <Routes>
                      <Route path="/" element={<Raiz />} />

                      {/* HU-1: acceso */}
                      {PUBLICAS.map(({ ruta, vista }) => (
                        <Route
                          key={ruta}
                          path={ruta}
                          element={<SoloVisitante>{vista}</SoloVisitante>}
                        />
                      ))}
                      <Route
                        path="/verificar"
                        element={
                          <MarcoPublico>
                            <VerificarCuenta />
                          </MarcoPublico>
                        }
                      />
                      <Route
                        path="/mi-cuenta"
                        element={
                          <ConSesion>
                            <MiCuenta />
                          </ConSesion>
                        }
                      />

                      {/* HU-2: inventario */}
                      <Route
                        path="/inventario"
                        element={
                          <Encargado>
                            <InventarioLista />
                          </Encargado>
                        }
                      />
                      <Route
                        path="/inventario/nuevo"
                        element={
                          <Encargado>
                            <EquipoFormulario />
                          </Encargado>
                        }
                      />
                      <Route
                        path="/inventario/:equipoId"
                        element={
                          <Encargado>
                            <EquipoDetalle />
                          </Encargado>
                        }
                      />
                      <Route
                        path="/inventario/:equipoId/editar"
                        element={
                          <Encargado>
                            <EquipoFormulario />
                          </Encargado>
                        }
                      />

                      {/* HU-3: catálogo y solicitud */}
                      <Route
                        path="/catalogo"
                        element={
                          <MarcoSegunRol>
                            <Catalogo />
                          </MarcoSegunRol>
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

                      {/* HU-4: aprobación y entrega */}
                      <Route
                        path="/solicitudes"
                        element={
                          <Encargado>
                            <BandejaSolicitudes />
                          </Encargado>
                        }
                      />
                      <Route
                        path="/entregas/:solicitudId"
                        element={
                          <Encargado>
                            <RegistrarEntrega />
                          </Encargado>
                        }
                      />
                      <Route
                        path="/constancias/:codigo"
                        element={
                          <ConSesion>
                            <ConstanciaEntrega />
                          </ConSesion>
                        }
                      />
                      <Route
                        path="/prestamos"
                        element={
                          <Encargado>
                            <PrestamosVigentes key="vigentes" />
                          </Encargado>
                        }
                      />
                      <Route
                        path="/vencidos"
                        element={
                          <Encargado>
                            <PrestamosVigentes key="vencidos" soloVencidos />
                          </Encargado>
                        }
                      />

                      {/* HU-5: devoluciones */}
                      <Route
                        path="/devoluciones"
                        element={
                          <Encargado>
                            <RegistrarDevolucion />
                          </Encargado>
                        }
                      />
                      <Route
                        path="/mi-deuda"
                        element={
                          <Estudiante>
                            <HistorialEstudiante propio />
                          </Estudiante>
                        }
                      />
                      <Route
                        path="/estudiantes/:estudianteId"
                        element={
                          <Encargado>
                            <HistorialEstudiante key="encargado" />
                          </Encargado>
                        }
                      />

                      {/* HU-6: reservas */}
                      <Route
                        path="/reservas"
                        element={
                          <ConSesion>
                            <Reservas />
                          </ConSesion>
                        }
                      />
                      <Route
                        path="/mis-reservas"
                        element={
                          <ConSesion>
                            <MisReservas />
                          </ConSesion>
                        }
                      />
                      <Route
                        path="/lista-espera"
                        element={
                          <Encargado>
                            <ListaEspera />
                          </Encargado>
                        }
                      />

                      {/* HU-7 */}
                      {OTRAS_HISTORIAS.map(({ ruta, titulo, historia }) => (
                        <Route
                          key={ruta}
                          path={ruta}
                          element={
                            <Encargado>
                              <PendienteDeOtraHistoria titulo={titulo} historia={historia} />
                            </Encargado>
                          }
                        />
                      ))}

                      <Route
                        path="*"
                        element={
                          <MarcoSegunRol>
                            <PaginaNoEncontrada />
                          </MarcoSegunRol>
                        }
                      />
                    </Routes>
                    <Notificaciones />
                  </DevolucionesProvider>
                </PrestamosProvider>
              </CatalogoProvider>
            </ReservaProvider>
          </InventarioProvider>
        </SesionProvider>
      </NotificacionProvider>
    </BrowserRouter>
  )
}
