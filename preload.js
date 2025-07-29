const { contextBridge, ipcRenderer } = require('electron');



contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke('ping')
});

contextBridge.exposeInMainWorld('api', {
  verificarLogin: (correo, contraseña) =>
    ipcRenderer.invoke('verificar-login', correo, contraseña),
  
   cargarInicio: () =>
    ipcRenderer.send('cargar-inicio')
});
