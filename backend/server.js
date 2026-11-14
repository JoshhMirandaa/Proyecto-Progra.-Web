require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  try {
    await pool.query('SELECT NOW()');
  } catch (err) {
    console.error('Error conectando a PostgreSQL al iniciar:', err.message);
  }
});