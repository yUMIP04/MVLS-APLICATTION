const APP_ID = "248eaff237044de999d683591fe2cdb6"; 
let client;
let localTracks = [];
let micMuted = false;
let videoMuted = false;
let socket;
let myAgoraUID = null;

//🌟GENERA UN CODIGO DE 6 CARACTERES
function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

window.onload = () => {
  document.getElementById("miCodigo").innerText = generarCodigo();

  document.getElementById("copiarCodigoBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("miCodigo").innerText)
      .then(() => mostrarNotificacion("📋 Código copiado"))
      .catch(() => mostrarNotificacion("⚠️ No se pudo copiar el código"));
  });

  document.getElementById("salirLlamadaBtn").addEventListener("click", salirLlamada);
  document.getElementById("muteBtn")?.addEventListener("click", toggleMute);
  document.getElementById("videoBtn")?.addEventListener("click", toggleVideo);

  document.getElementById("chat-enviar").addEventListener("click", enviarMensaje);

  // Enviar mensaje con Enter
  document.getElementById("chat-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarMensaje();
  });
};

//🌟OBTENER TOKEN DEL SERVIDOR NODE 8080
async function obtenerToken(channel) {
  const response = await fetch(`http://localhost:8080/access_token?channelName=${channel}`);
  const data = await response.json();
  return data.token;
}

//🌟CONECTAR AGORA + WEBSOCKET
async function conectar() {
  const canal = document.getElementById("codigoRemoto").value.trim();
  if (!canal) return mostrarNotificacion("⚠️ Escribe el código del otro usuario");

  try {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    const token = await obtenerToken(canal);

    myAgoraUID = await client.join(APP_ID, canal, token, null);

    mostrarNotificacion(`✅ Conectado al canal: ${canal} (Mi UID: ${myAgoraUID})`);

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
        } 
        else if (data.type === "unmute") {
          mostrarNotificacion(`🎤 Usuario UID ${data.from} activó su micrófono.`);
        } 
        else if (data.type === "video-off") {
          mostrarNotificacion(`🚫 Usuario UID ${data.from} apagó su cámara.`);
        } 
        else if (data.type === "video-on") {
          mostrarNotificacion(`📷 Usuario UID ${data.from} encendió su cámara.`);
        }
        else if (data.type === "user-disconnected") {
          mostrarNotificacion(`❌ Usuario UID ${data.from} se ha desconectado.`);
        }
        else if (data.type === "chat") {
          mostrarMensaje(data.message, false, `UID ${data.from}`);
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
      mostrarNotificacion(`📴 Usuario UID ${user.uid} dejó de transmitir video o audio.`);
    });

    client.on("user-left", (user) => {
      mostrarNotificacion(`❌ Usuario UID ${user.uid} salió de la llamada.`);
    });

  } catch (err) {
    console.error("Error al unirse al canal:", err);
    mostrarNotificacion("❌ Error al unirse a la videollamada.");
  }
}

//🌟SALIR DE LA LLAMADA
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

//🌟MUTE/UNMUTE
async function toggleMute() {
  if (!localTracks.length) return;

  const audioTrack = localTracks[0];
  if (micMuted) {
    await audioTrack.setEnabled(true);
    micMuted = false;
    document.getElementById("muteBtn").innerText = "🔊 Silenciar";
    socket?.send(JSON.stringify({ type: "unmute", to: null, from: myAgoraUID }));
  } else {
    await audioTrack.setEnabled(false);
    micMuted = true;
    document.getElementById("muteBtn").innerText = "🔇 Activar micrófono";
    socket?.send(JSON.stringify({ type: "mute", to: null, from: myAgoraUID }));
  }
}

//🌟VIDEO ON/OFF
async function toggleVideo() {
  if (localTracks.length < 2) return;

  const videoTrack = localTracks[1];
  if (videoMuted) {
    await videoTrack.setEnabled(true);
    videoMuted = false;
    document.getElementById("videoBtn").innerText = "📷 Apagar cámara";
    socket?.send(JSON.stringify({ type: "video-on", to: null, from: myAgoraUID }));
  } else {
    await videoTrack.setEnabled(false);
    videoMuted = true;
    document.getElementById("videoBtn").innerText = "🚫 Encender cámara";
    socket?.send(JSON.stringify({ type: "video-off", to: null, from: myAgoraUID }));
  }
}

//🌟ENVÍO DE MENSAJE DE CHAT
function enviarMensaje() {
  const input = document.getElementById("chat-input");
  const mensaje = input.value.trim();
  if (!mensaje || !socket) return;

  socket.send(JSON.stringify({
    type: "chat",
    message: mensaje,
    from: myAgoraUID
  }));

  mostrarMensaje(mensaje, true);
  input.value = "";
}

//🌟NOTIFICACIONES
function mostrarNotificacion(texto) {
  const div = document.getElementById("notificaciones");
  if (!div) return;

  div.innerText = texto;
  div.style.display = "block";
  div.style.opacity = 1;

  setTimeout(() => {
    div.style.opacity = 0;
    setTimeout(() => div.style.display = "none", 1000);
  }, 4000);
}

//🌟MOSTRAR MENSAJE EN EL CHAT
function mostrarMensaje(texto, propio = false, remitente = "Usuario") {
  const contenedor = document.getElementById("chat-mensajes");
  const div = document.createElement("div");

  div.classList.add("chat-mensaje");
  if (propio) div.classList.add("chat-mensaje-propio");

  div.innerText = propio ? texto : `${remitente}: ${texto}`;

  contenedor.appendChild(div);
  contenedor.scrollTop = contenedor.scrollHeight;
}

