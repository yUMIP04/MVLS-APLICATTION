// socket-server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3001 });
const clients = new Map();

wss.on('connection', (ws) => {
  let currentUser = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === "register") {
        currentUser = data.userId;
        clients.set(data.userId, ws);
      } else if (data.type === "mute" || data.type === "unmute") {
        const target = clients.get(data.to);
        if (target) {
          target.send(JSON.stringify({ type: data.type, from: currentUser }));
        }
      }
    } catch (e) {
      console.error("Error al procesar mensaje:", e);
    }
  });

  ws.on('close', () => {
    if (currentUser) clients.delete(currentUser);
  });
});
