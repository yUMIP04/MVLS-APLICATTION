const APP_ID = "248eaff237044de999d683591fe2cdb6";
let client;
let localTracks = [];
let micMuted = false;   // Estado micrófono
let videoMuted = false; // Estado video
let socket;

function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

window.onload = () => {
  const miCodigo = generarCodigo();
  document.getElementById("miCodigo").innerText = miCodigo;
  window.miCodigo = miCodigo;

  document.getElementById("copiarCodigoBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(miCodigo)
      .then(() => mostrarNotificacion("📋 Código copiado"))
      .catch(() => mostrarNotificacion("⚠️ No se pudo copiar el código"));
  });

  document.getElementById("salirLlamadaBtn").addEventListener("click", salirLlamada);

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) muteBtn.addEventListener("click", toggleMute);

  const videoBtn = document.getElementById("videoBtn");
  if (videoBtn) videoBtn.addEventListener("click", toggleVideo);

  socket = new WebSocket("ws://localhost:3001");

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: "register",
      userId: window.miCodigo
    }));
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "mute") {
        mostrarNotificacion(`🔇 Usuario ${data.from} silenció su micrófono.`);
      } else if (data.type === "unmute") {
        mostrarNotificacion(`🎤 Usuario ${data.from} activó su micrófono.`);
      } else if (data.type === "video-off") {
        mostrarNotificacion(`🚫 Usuario ${data.from} apagó su cámara.`);
      } else if (data.type === "video-on") {
        mostrarNotificacion(`📷 Usuario ${data.from} encendió su cámara.`);
      } else if (data.type === "user-disconnected") {
        mostrarNotificacion(`❌ Usuario ${data.from} se ha desconectado.`);
      }
    } catch (error) {
      console.error("Error al procesar mensaje WebSocket:", error);
    }
  };

  socket.onerror = (err) => {
    console.error("Error en WebSocket:", err);
  };
};

async function obtenerToken(channel) {
  const response = await fetch(`http://localhost:8080/access_token?channelName=${channel}`);
  const data = await response.json();
  return data.token;
}

async function conectar() {
  const canal = document.getElementById("codigoRemoto").value.trim();
  if (!canal) return mostrarNotificacion("⚠️ Escribe el código del otro usuario");

  try {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    const token = await obtenerToken(canal);
    await client.join(APP_ID, canal, token, null);

    client.on("user-joined", (user) => {
      mostrarNotificacion(`🎥 Un usuario se conectó: UID ${user.uid}`);
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
    });

    mostrarNotificacion(`✅ Conectado al canal: ${canal}`);
  } catch (err) {
    console.error("Error al unirse al canal:", err);
    mostrarNotificacion("❌ Error al unirse a la videollamada.");
  }
}

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

async function toggleMute() {
  if (!localTracks.length) return;

  const audioTrack = localTracks[0];
  const targetUserId = document.getElementById("codigoRemoto").value.trim();
  if (!targetUserId) {
    mostrarNotificacion("⚠️ Debes ingresar el código del usuario remoto.");
    return;
  }

  if (micMuted) {
    await audioTrack.setEnabled(true);
    micMuted = false;
    document.getElementById("muteBtn").innerText = "🔊 Silenciar";
    mostrarNotificacion("🎤 Micrófono activado");
    socket.send(JSON.stringify({ type: "unmute", from: window.miCodigo, to: targetUserId }));
  } else {
    await audioTrack.setEnabled(false);
    micMuted = true;
    document.getElementById("muteBtn").innerText = "🔇 Activar micrófono";
    mostrarNotificacion("🔇 Micrófono silenciado");
    socket.send(JSON.stringify({ type: "mute", from: window.miCodigo, to: targetUserId }));
  }
}

async function toggleVideo() {
  if (localTracks.length < 2) return;

  const videoTrack = localTracks[1];
  const targetUserId = document.getElementById("codigoRemoto").value.trim();
  if (!targetUserId) {
    mostrarNotificacion("⚠️ Debes ingresar el código del usuario remoto.");
    return;
  }

  if (videoMuted) {
    await videoTrack.setEnabled(true);
    videoMuted = false;
    document.getElementById("videoBtn").innerText = "📷 Apagar cámara";
    mostrarNotificacion("📷 Cámara activada");
    socket.send(JSON.stringify({ type: "video-on", from: window.miCodigo, to: targetUserId }));
  } else {
    await videoTrack.setEnabled(false);
    videoMuted = true;
    document.getElementById("videoBtn").innerText = "🚫 Encender cámara";
    mostrarNotificacion("🚫 Cámara apagada");
    socket.send(JSON.stringify({ type: "video-off", from: window.miCodigo, to: targetUserId }));
  }
}

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

