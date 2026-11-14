const express = require('express');
const cors = require('cors');
const cuentasRoutes = require('./routes/cuentasRoutes');

const app = express();

app.use(cors()); // Permite peticiones desde React (localhost:5173)
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'Backend Almacén de Equipos activo' });
});

app.use('/api', cuentasRoutes);

module.exports = app;