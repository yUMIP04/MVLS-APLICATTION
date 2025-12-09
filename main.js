const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('node:path');



const BACKEND_URL = 'https://backend-mvls-production.up.railway.app'; 

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

app.whenReady().then(() => {
 
  ipcMain.handle('verificar-login', async (event, correo, contraseña) => {
    console.log("Enviando petición de login a Railway:", correo);

    try {
     
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ correo, contraseña })
      });

      const data = await response.json();
      
      
      console.log("Respuesta del servidor:", data);
      
      return {
        exito: data.exito,
        nombre: data.nombre
      };

    } catch (error) {
      console.error("❌ Error conectando con el servidor:", error);
      return { exito: false, error: "Error de conexión" };
    }
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