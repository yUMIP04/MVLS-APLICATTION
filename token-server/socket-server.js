//🌟IMPORTACIONES PARA MANEJAR WEBSOCKETS CON NODE.JS
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });
const clients = new Map();

//🌟CUANDO UN CLIENTE SE CONECTA
wss.on('connection', (ws) => {
  let currentUser = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch(data.type) {

        //🌟REGISTRAR USUARIO 
        case "register":
          currentUser = data.userId;
          clients.set(currentUser, ws);
          console.log(`Usuario entro a videollamada: ${currentUser}`);
          break;

        //🌟CHAT — NUEVO 🚀
        case "chat":
          if (!currentUser) return;
          console.log(`💬 Mensaje de ${currentUser}: ${data.message}`);

          // reenviar a todos menos al que envió
          clients.forEach((clientWs, uid) => {
            if (clientWs !== ws) {
              clientWs.send(JSON.stringify({
                type: "chat",
                from: currentUser,
                message: data.message
              }));
            }
          });
          break;

        //🌟NOTIFICACIONES DE AUDIO/VIDEO
        case "mute":
        case "unmute":
        case "video-on":
        case "video-off":
          if (!currentUser) return;

          const target = clients.get(data.to);
          if (target && target !== ws) {
            target.send(JSON.stringify({
              type: data.type,
              from: currentUser
            }));
            console.log(`Mensaje ${data.type} enviado de ${currentUser} a ${data.to}`);
          }
          break;

        default:
          console.warn("Tipo de mensaje WebSocket desconocido:", data.type);
      }

    } catch (e) {
      console.error("Error al procesar mensaje:", e);
    }
  });

  //🌟CUANDO UN CLIENTE SE DESCONECTE
  ws.on('close', () => {
    if (currentUser) {
      clients.delete(currentUser);
      console.log(`Usuario desconectado: ${currentUser}`);

      clients.forEach((clientWs) => {
        if (clientWs !== ws) {
          clientWs.send(JSON.stringify({
            type: "user-disconnected",
            from: currentUser
          }));
        }
      });
    }
  });
});

