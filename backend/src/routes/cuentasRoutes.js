const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuentasController');

router.get('/usuarios', ctrl.getUsuarios);
router.post('/auth/login', ctrl.login);
router.post('/auth/registro', ctrl.registro);
router.post('/auth/verificar', ctrl.verificar);
router.post('/auth/recuperar', ctrl.solicitarRecuperacion);
router.get('/auth/recuperar/:token', ctrl.revisarTokenRecuperacion);
router.post('/auth/restablecer', ctrl.restablecer);
router.put('/usuarios/:id', ctrl.editarPerfil);
router.put('/usuarios/:id/contrasena', ctrl.cambiarClave);

module.exports = router;