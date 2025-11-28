const { contextBridge, ipcRenderer } = require('electron');

const BACKEND_URL = 'https://db-mvls-production-d464.up.railway.app'; // tu backend en Railway

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: async () => 'pong desde preload.js'
});

contextBridge.exposeInMainWorld('api', {
  verificarLogin: async (correo, contraseña) => {
    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contraseña }) // la ñ coincide con la columna
      });

      const data = await res.json();
      if (!res.ok) return { exito: false, mensaje: data.error };
      return { exito: true, ...data };
    } catch (err) {
      return { exito: false, mensaje: 'Error de conexión' };
    }
  },

  cargarInicio: () => ipcRenderer.send('cargar-inicio')
});

