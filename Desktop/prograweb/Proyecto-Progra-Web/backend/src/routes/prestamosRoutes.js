const express = require('express');
const router = express.Router();
const {
  obtenerSolicitudes,
  resolverSolicitud,
  registrarEntrega,
  obtenerPrestamosVigentes
} = require('../controllers/prestamosController');

router.get('/solicitudes', obtenerSolicitudes);
router.put('/solicitudes/:id/resolver', resolverSolicitud);
router.post('/entregas', registrarEntrega);
router.get('/prestamos/vigentes', obtenerPrestamosVigentes);

module.exports = router;