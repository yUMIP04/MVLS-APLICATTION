//🌟IMPORTACIONES PARA MANEJAR WEBSOCKETS CON NODE.JS
//🌟SE CREA UN SERVIDOR WEBSOCKET ESCUCHANDO EL PUERTO 3001
//🌟EL MAP GUARDA LA RELACION ENTRE EL ID DE USUARIO(userId) Y SU CONEXION WEBSOCKET Y PERMITE ENVIAR MENSAJES A UN USUARIO ESPECIFICO
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });
const clients = new Map();

//🌟ESTO SE EJECUTA CUANDO UN CLIENTE SE CONECTA CON EL WEBSOCKET Y GUARDA EL userId DEL CLIENTE DESPUES DE REGISTRARSE
wss.on('connection', (ws) => {
  let currentUser = null;


  //🌟SE EJECUTARA CADA VEZ QUE ESTE CLIENTE ENVIA UN MENSAJE Y EL JSON.parse CONVIERTE EL MENSAJE A UN OBJETO JS
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

//🌟EL SWITCH ACTUARA DEPENDIENDO DEL CASO:
      switch(data.type) {

        //🌟GUARDA EL ID DE USUARIO QUE ENVIO EL CLIENTE PARA LA VIDEOLLAMADA
        //🌟SE AGREGA A clients  PARA QUE LUEGO SE PUEDA BUSCAR DESPUES
        //🌟YA QUE ESTO NOS PERMITIRA IDENTIFICAR QUIEN ENVIA LAS NOTIFICACIONES
        case "register":
          currentUser = data.userId;
          clients.set(currentUser, ws);
          console.log(`Usuario entro a videollamada: ${currentUser}`);
          break;

          //🌟ESTO SE EJECUTA DESPUES DE QUE EL USUARIO SE A REGISTRADO
          //🌟SI UN USUARIO ESTA DENTRO DE LA VIDEOLLAMADA SE BUSCARA CON clients.get(data.to)
          //🌟Y SI EXISTE, ENVIARA LAS NOTIFICACIONES DE MUTEO,UNMUTE ETC Y QUIEN LO ENVIO
        case "mute":
        case "unmute":
        case "video-on":
        case "video-off":
          if (!currentUser) return;
          // Enviar solo al usuario destinatario
          const target = clients.get(data.to);
          if (target && target !== ws) {
            target.send(JSON.stringify({
              type: data.type,
              from: currentUser
            }));
            console.log(`Mensaje ${data.type} enviado de ${currentUser} a ${data.to}`);
          }
          break;

          //🌟SI ALGUNA NOTIFICACION NO COINCIDE CON NINGUNO DE LOS CASOS SE MUESTRA ADVERTENCIA
        default:
          console.warn("Tipo de mensaje WebSocket desconocido:", data.type);
      }

    } catch (e) {
      console.error("Error al procesar mensaje:", e);
    }
  });

  //🌟CUANDO EL CLIENTE SE DESCONECTE LO ELIMINARA DE Map Y NOTIFICA A LOS USUARIOS
  ws.on('close', () => {
    if (currentUser) {
      clients.delete(currentUser);
      console.log(`Usuario desconectado de videollamada : ${currentUser}`);

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


