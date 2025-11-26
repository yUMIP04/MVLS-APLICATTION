const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuración conexión MySQL
const conexion = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

async function encriptarExistentes() {
  const db = await mysql.createConnection(conexion);

  // 1. Leer todas las contraseñas
  const [usuarios] = await db.execute('SELECT id, contraseña FROM usuarios');

  for (const usuario of usuarios) {
    const contrasenia = usuario.contraseña;

    // 2. Detectar si NO está encriptada (bcryptjs inicia con $2a$ o $2b$)
    if (!contrasenia.startsWith('$2')) {
      console.log(`🔐 Encriptando contraseña del usuario ID: ${usuario.id}`);

      const hash = bcrypt.hashSync(contrasenia, 10);

      await db.execute(
        'UPDATE usuarios SET contraseña = ? WHERE id = ?',
        [hash, usuario.id]
      );
    }
  }

  console.log("✅ Todas las contraseñas han sido encriptadas correctamente.");
  db.end();
}

encriptarExistentes();

