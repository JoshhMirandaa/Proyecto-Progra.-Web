/**
 * Almacén compartido de solicitudes de préstamo.
 *
 * La solicitud tiene una sola fuente de datos, pero la escriben dos historias, cada una en
 * su momento (ver CONTRATO-DATOS.md): la HU-3 la crea y la retira; la HU-4 la aprueba, la
 * rechaza y registra la entrega. Este módulo solo lee y guarda: las reglas viven en el
 * servicio de cada historia. En la segunda entrega lo reemplaza la tabla de solicitudes.
 */
import semilla from '../data/seed-solicitudes.json'
import { listarReservasOcupacion } from './reservasService.js'

const CLAVE_SOLICITUDES = 'hu3.solicitudes.v1'

const clonar = (valor) => JSON.parse(JSON.stringify(valor))

export function leerSolicitudes() {
  try {
    const crudo = localStorage.getItem(CLAVE_SOLICITUDES)
    if (crudo) {
      const datos = JSON.parse(crudo)
      if (Array.isArray(datos)) return datos
    }
  } catch {
    // localStorage no disponible o con contenido inválido: se usa la semilla
  }
  const inicial = clonar(semilla.solicitudes)
  escribirSolicitudes(inicial)
  return inicial
}

export function escribirSolicitudes(lista) {
  try {
    localStorage.setItem(CLAVE_SOLICITUDES, JSON.stringify(lista))
  } catch {
    // en modo privado el guardado puede fallar; la sesión sigue funcionando en memoria
  }
}

export function restablecerSolicitudesSemilla() {
  const inicial = clonar(semilla.solicitudes)
  escribirSolicitudes(inicial)
  return inicial
}

export function siguienteIdSolicitud(lista) {
  const numeros = lista
    .map((s) => Number(String(s.id).split('-')[1]))
    .filter((n) => Number.isFinite(n))
  const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1
  return `SOL-${String(siguiente).padStart(4, '0')}`
}

/** Reservas activas de la HU-6. Si su almacén no responde, se sigue sin ellas. */
export async function leerReservasActivas() {
  try {
    return await listarReservasOcupacion()
  } catch {
    return []
  }
}
