const cuentasService = require('../services/cuentasService');

async function getUsuarios(req, res) {
  try {
    res.json(await cuentasService.listarUsuarios());
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
}

async function login(req, res) {
  try {
    const correo = req.body.correo;
    const clave = req.body.contrasena || req.body.clave;
    res.json(await cuentasService.iniciarSesion(correo, clave));
  } catch (e) {
    res.status(e.status || 401).json({ mensaje: e.message, estado: e.estado });
  }
}

async function registro(req, res) {
  try {
    res.status(201).json(await cuentasService.registrarUsuario(req.body));
  } catch (e) {
    res.status(e.status || 400).json({ mensaje: e.message, tipo: e.tipo });
  }
}

async function verificar(req, res) {
  try {
    res.json(await cuentasService.verificarCuenta(req.body.token));
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
}

async function editarPerfil(req, res) {
  try {
    res.json(await cuentasService.actualizarPerfil(req.params.id, req.body));
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
}

async function cambiarClave(req, res) {
  try {
    res.json(await cuentasService.cambiarContrasena(req.params.id, req.body));
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
}

async function solicitarRecuperacion(req, res) {
  try {
    res.json(await cuentasService.solicitarRecuperacion(req.body.correo));
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
}

async function revisarTokenRecuperacion(req, res) {
  try {
    res.json(await cuentasService.revisarEnlaceRecuperacion(req.params.token));
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
}

async function restablecer(req, res) {
  try {
    res.json(await cuentasService.restablecerContrasena(req.body.token, req.body));
  } catch (e) {
    res.status(400).json({ mensaje: e.message });
  }
}

module.exports = {
  getUsuarios,
  login,
  registro,
  verificar,
  editarPerfil,
  cambiarClave,
  solicitarRecuperacion,
  revisarTokenRecuperacion,
  restablecer
};