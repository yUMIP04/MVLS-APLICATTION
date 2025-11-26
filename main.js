const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');   // ← bcryptjs (NO usar bcrypt)
require('dotenv').config();

let db;

// Conectar a MySQL
async function conectarBD() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });
    console.log('✅ Conexión exitosa a MySQL');
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err);
  }
}

// Crear ventana de login
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
};

app.whenReady().then(async () => {
  await conectarBD();

  // 🔐 Verificación de login usando contraseñas encriptadas
  ipcMain.handle('verificar-login', async (event, correo, contraseña) => {
    console.log("Verificando login con:", correo, contraseña);

    // 1. Buscar usuario según el correo
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (rows.length === 0) {
      console.log("❌ Usuario no encontrado");
      return { exito: false };
    }

    const usuario = rows[0];

    // 2. Comparar contraseña ingresada vs. hash
    const esCorrecta = bcrypt.compareSync(contraseña, usuario.contraseña);

    if (!esCorrecta) {
      console.log("❌ Contraseña incorrecta");
    }

    return {
      exito: esCorrecta,
      nombre: esCorrecta ? usuario.nombre : null
    };
  });

  ipcMain.handle('ping', () => {
    return "pong desde main.js";
  });

  ipcMain.on('cargar-inicio', () => {
    const nuevaVentana = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    nuevaVentana.loadFile('inicio.html');
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

