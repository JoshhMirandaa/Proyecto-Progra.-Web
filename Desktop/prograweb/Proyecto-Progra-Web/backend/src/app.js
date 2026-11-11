const express = require('express');
const cors = require('cors');
require('dotenv').config();

const prestamosRoutes = require('./routes/prestamosRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de salud / verificación
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend de HU-4 funcionando correctamente' });
});

// Rutas principales de la HU-4
app.use('/api', prestamosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor de HU-4 corriendo en http://localhost:${PORT}`);
});