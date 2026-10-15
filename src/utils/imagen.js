/**
 * Reduce una imagen elegida por el encargado a un cuadrado pequeño y la devuelve
 * como data URL.
 *
 * El alcance del proyecto no incluye carga de archivos al servidor, así que en esta
 * entrega la fotografía se queda en el navegador. Se recorta a 1:1 (el encuadre que
 * pide el mockup) y se reduce a 480 px para no llenar el almacenamiento local.
 */
const LADO = 480
const CALIDAD = 0.72
export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp']

export function leerImagenCuadrada(archivo) {
  return new Promise((resolve, reject) => {
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
      reject(new Error('Solo se admiten imágenes JPG, PNG o WEBP.'))
      return
    }

    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No pudimos leer el archivo.'))
    lector.onload = () => {
      const imagen = new Image()
      imagen.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      imagen.onload = () => {
        const lienzo = document.createElement('canvas')
        lienzo.width = LADO
        lienzo.height = LADO
        const ctx = lienzo.getContext('2d')
        const lado = Math.min(imagen.width, imagen.height)
        ctx.drawImage(
          imagen,
          (imagen.width - lado) / 2,
          (imagen.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          LADO,
          LADO,
        )
        resolve(lienzo.toDataURL('image/jpeg', CALIDAD))
      }
      imagen.src = lector.result
    }
    lector.readAsDataURL(archivo)
  })
}
