

const APP_ID = "248eaff237044de999d683591fe2cdb6"; //🌟ID DE LA APLICACION DE AGORA
let client;//🌟CONEXION CON AGORA
let localTracks = [];//🌟GUARDA EL USUARIO Y VIDEO LOCAL
let micMuted = false;//🌟CONTROLA EL MUTEO DE LA CAMARA
let videoMuted = false;//🌟CONTROLA EL MUTEO DEL VIDEO
let socket;//🌟GUARDA LA CONEXION CON EL SERVIDOR WEBSOCKET
let myAgoraUID = null; // GUARDA EL UID DE AGORA COMO IDENTIFICACION

//🌟GENERA UN CODIGO DE 6 CARACTERES
function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

window.onload = () => {
  //🌟CONFIGURA EL BOTON PARA COPIAR Y PEGAR EL CODIGO Y LOS EVENTOS PARA BOTONES
  document.getElementById("miCodigo").innerText = generarCodigo();

  document.getElementById("copiarCodigoBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("miCodigo").innerText)
      .then(() => mostrarNotificacion("📋 Código copiado"))
      .catch(() => mostrarNotificacion("⚠️ No se pudo copiar el código"));
  });

  document.getElementById("salirLlamadaBtn").addEventListener("click", salirLlamada);
  document.getElementById("muteBtn")?.addEventListener("click", toggleMute);
  document.getElementById("videoBtn")?.addEventListener("click", toggleVideo);
};
//🌟HACE UNA PETICION HTTP AL SERVIDOR 8080 PARA OBTENER EL TOKEN DE ACCESO AL CANAL DE AGORA
async function obtenerToken(channel) {
  const response = await fetch(`http://localhost:8080/access_token?channelName=${channel}`);
  const data = await response.json();
  return data.token;
}

//🌟TOMA EL CODIGO DE LA SALA QUE INGRESA EL USUARIO, CREA EL CLIENTE DE AGORA, OBTIENE EL TOKEN DE LA SALA
//🌟Y CREA CONEXION WEBSOCKET AL SERVIDOR 3001 Y SE REGISTRA POR ASI DECIRLO, GUARDA EL UID PARA ENVIAR NOTIFICACIONES
async function conectar() {
  const canal = document.getElementById("codigoRemoto").value.trim();
  if (!canal) return mostrarNotificacion("⚠️ Escribe el código del otro usuario");

  try {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    const token = await obtenerToken(canal);

   
    myAgoraUID = await client.join(APP_ID, canal, token, null);

    mostrarNotificacion(`✅ Conectado al canal: ${canal} (Mi UID: ${myAgoraUID})`);

  //🌟SU REGISTRO ES CON EL UID QUE ASIGNA AGORA
    socket = new WebSocket("ws://localhost:3001");
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "register",
        userId: myAgoraUID 
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "mute") {
          mostrarNotificacion(`🔇 Usuario UID ${data.from} silenció su micrófono.`);
        } else if (data.type === "unmute") {
          mostrarNotificacion(`🎤 Usuario UID ${data.from} activó su micrófono.`);
        } else if (data.type === "video-off") {
          mostrarNotificacion(`🚫 Usuario UID ${data.from} apagó su cámara.`);
        } else if (data.type === "video-on") {
          mostrarNotificacion(`📷 Usuario UID ${data.from} encendió su cámara.`);
        } else if (data.type === "user-disconnected") {
          mostrarNotificacion(`❌ Usuario UID ${data.from} se ha desconectado.`);
        }
      } catch (error) {
        console.error("Error al procesar mensaje WebSocket:", error);
      }
    };

    // Agora events
    client.on("user-joined", (user) => {
      mostrarNotificacion(`🎥 Usuario conectado: UID ${user.uid}`);
    });

    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const videoTrack = await AgoraRTC.createCameraVideoTrack();

    videoTrack.play("local-stream");
    localTracks.push(audioTrack, videoTrack);
    await client.publish(localTracks);

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        const div = document.createElement("div");
        div.id = `remote-player-${user.uid}`;
        div.style.width = "300px";
        div.style.height = "300px";
        div.style.border = "1px solid #ccc";
        div.style.margin = "5px";
        document.getElementById("remote-streams").appendChild(div);
        user.videoTrack.play(div.id);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    client.on("user-unpublished", (user) => {
      document.getElementById(`remote-player-${user.uid}`)?.remove();
      mostrarNotificacion(`📴 Usuario UID ${user.uid} dejó de transmitir video.`);
    });

    client.on("user-left", (user) => {
      mostrarNotificacion(`❌ Usuario UID ${user.uid} salió de la llamada.`);
    });

  } catch (err) {
    console.error("Error al unirse al canal:", err);
    mostrarNotificacion("❌ Error al unirse a la videollamada.");
  }
}

//🌟DEJA EL CANAL Y LIMPIA LA INTERFAZ DE VIDEO Y AUDIO Y MUESTRA NOTIFICACION DE SALIDA
async function salirLlamada() {
  if (!client) return;
  try {
    localTracks.forEach(track => {
      track.stop();
      track.close();
    });
    localTracks = [];
    await client.leave();
    document.getElementById("remote-streams").innerHTML = "";
    document.getElementById("local-stream").innerHTML = "";
    mostrarNotificacion("📴 Has salido de la llamada.");
  } catch (error) {
    console.error("Error al salir de la llamada:", error);
  }
}

//🌟FUCIONARA DEPENDIENDO SI SE PUTEA MICROFONO O NO Y CAMBIARA EL TEXTO DEL BOTON Y LE ENVIA MENSAJE AL SOCKET PARA QUE LO REENVIE A LOS DEMAS
async function toggleMute() {
  if (!localTracks.length) return;

  const audioTrack = localTracks[0];
  if (micMuted) {
    await audioTrack.setEnabled(true);
    micMuted = false;
    document.getElementById("muteBtn").innerText = "🔊 Silenciar";
    mostrarNotificacion(`🎤 Micrófono activado (UID: ${myAgoraUID})`);
    socket?.send(JSON.stringify({ type: "unmute", from: myAgoraUID }));
  } else {
    await audioTrack.setEnabled(false);
    micMuted = true;
    document.getElementById("muteBtn").innerText = "🔇 Activar micrófono";
    mostrarNotificacion(`🔇 Micrófono silenciado (UID: ${myAgoraUID})`);
    socket?.send(JSON.stringify({ type: "mute", from: myAgoraUID }));
  }
}

//🌟ES LO MISMO PERO PARA EL VIDEO
async function toggleVideo() {
  if (localTracks.length < 2) return;

  const videoTrack = localTracks[1];
  if (videoMuted) {
    await videoTrack.setEnabled(true);
    videoMuted = false;
    document.getElementById("videoBtn").innerText = "📷 Apagar cámara";
    mostrarNotificacion(`📷 Cámara activada (UID: ${myAgoraUID})`);
    socket?.send(JSON.stringify({ type: "video-on", from: myAgoraUID }));
  } else {
    await videoTrack.setEnabled(false);
    videoMuted = true;
    document.getElementById("videoBtn").innerText = "🚫 Encender cámara";
    mostrarNotificacion(`🚫 Cámara apagada (UID: ${myAgoraUID})`);
    socket?.send(JSON.stringify({ type: "video-off", from: myAgoraUID }));
  }
}
//🌟CAMBIA EL CONTENIDO DE LA NOTIFICACION DEPENDIENDO DE QUE HAGA EL USUARIO
function mostrarNotificacion(texto) {
  const div = document.getElementById("notificaciones");
  if (!div) return;

  div.innerText = texto;
  div.style.display = "block";
  div.style.opacity = 1;

  setTimeout(() => {
    div.style.opacity = 0;
    setTimeout(() => {
      div.style.display = "none";
    }, 1000);
  }, 4000);
}
