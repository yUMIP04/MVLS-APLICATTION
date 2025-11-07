
const APP_ID = "248eaff237044de999d683591fe2cdb6"; //🌟ID DE LA APLICACION DE AGORA
let client;//🌟CONEXION CON AGORA
let localTracks = [];//🌟GUARDA EL USUARIO Y VIDEO LOCAL
let micMuted = false;//🌟CONTROLA EL MUTEO DE LA CAMARA
let videoMuted = false;//🌟CONTROLA EL MUTEO DEL VIDEO
let socket;//🌟GUARDA LA CONEXION CON EL SERVIDOR WEBSOCKET
let myAgoraUID = null; // GUARDA EL UID DE AGORA COMO IDENTIFICACION

/// 🌟 Genera un código de 6 caracteres
function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 🌟 Carga inicial: genera código y asigna botones
window.onload = () => {
  document.getElementById("miCodigo").innerText = generarCodigo();
  document.getElementById("copiarCodigoBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("miCodigo").innerText)
      .then(() => mostrarNotificacion("📋 Código copiado"))
      .catch(() => mostrarNotificacion("⚠️ No se pudo copiar el código"));
  });

  document.getElementById("salirLlamadaBtn").addEventListener("click", salirLlamada);
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  document.getElementById("videoBtn").addEventListener("click", toggleVideo);
};

// 🌟 Obtiene el token desde el servidor (puerto 8080)  
async function obtenerToken(channel) {
  try {
    const response = await fetch(`http://192.168.0.12:8080/access_token?channelName=${channel}`);
    if (!response.ok) throw new Error("No se pudo obtener el token");
    const data = await response.json();
    console.log("Token recibido:", data);
    return data.rtcToken; // o data.token según tu servidor
  } catch (error) {
    console.error("Error al obtener token:", error);
    return null;
  }
}


// 🌟 Conecta al canal de Agora
async function conectar() {
  const canal = document.getElementById("codigoRemoto").value.trim();
  if (!canal) return mostrarNotificacion("⚠️ Escribe el código del otro usuario");

  try {
    // Crear cliente
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Escuchar cuando otro usuario publica su audio o video
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

    client.on("user-left", (user) => {
      document.getElementById(`remote-player-${user.uid}`)?.remove();
      mostrarNotificacion(`❌ Usuario UID ${user.uid} salió de la llamada.`);
    });

    // Unirse al canal con token
    const token = await obtenerToken(canal);
    myAgoraUID = await client.join(APP_ID, canal, token, null);

    // Crear audio y video locales
    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const videoTrack = await AgoraRTC.createCameraVideoTrack();

    // Mostrar tu video local
    videoTrack.play("local-stream");

    // Publicar tus pistas
    localTracks.push(audioTrack, videoTrack);
    await client.publish(localTracks);

    mostrarNotificacion(`✅ Conectado al canal: ${canal}`);
  } catch (err) {
    console.error("Error al unirse al canal:", err);
    mostrarNotificacion("❌ Error al unirse a la videollamada.");
  }
}

// 🌟 Salir de la llamada
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

// 🌟 Mute / Unmute micrófono
async function toggleMute() {
  if (!localTracks.length) return;
  const audioTrack = localTracks[0];
  const muteBtn = document.getElementById("muteBtn");

  if (audioTrack.enabled) {
    await audioTrack.setEnabled(false);
    muteBtn.innerText = "🔇 Activar micrófono";
    mostrarNotificacion("🔇 Micrófono silenciado.");
  } else {
    await audioTrack.setEnabled(true);
    muteBtn.innerText = "🔊 Silenciar";
    mostrarNotificacion("🎤 Micrófono activado.");
  }
}

// 🌟 Apagar / Encender cámara
async function toggleVideo() {
  if (localTracks.length < 2) return;
  const videoTrack = localTracks[1];
  const videoBtn = document.getElementById("videoBtn");

  if (videoTrack.enabled) {
    await videoTrack.setEnabled(false);
    videoBtn.innerText = "🚫 Encender cámara";
    mostrarNotificacion("📷 Cámara apagada.");
  } else {
    await videoTrack.setEnabled(true);
    videoBtn.innerText = "📷 Apagar cámara";
    mostrarNotificacion("📷 Cámara encendida.");
  }
}

// 🌟 Mostrar notificaciones
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