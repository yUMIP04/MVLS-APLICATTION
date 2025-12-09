// 👇 TU URL DE RAILWAY (Sin la barra al final)
const BACKEND_URL = "https://backend-mvls-production.up.railway.app"; 

const APP_ID = "248eaff237044de999d683591fe2cdb6"; 
let client;
let localTracks = [];
let micMuted = false;
let videoMuted = false;
let socket; 
let myAgoraUID = null;


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

// 🌟 OBTENER TOKEN DEL SERVIDOR 
async function obtenerToken(channel, uid) {
  try {
    const response = await fetch(`${BACKEND_URL}/agora-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName: channel, uid: uid })
    });
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error obteniendo token:", error);
    mostrarNotificacion("⚠️ Error de conexión con el servidor");
    return null;
  }
}

// 🌟 CONECTAR AGORA + SOCKET.IO
async function conectar() {
  const canal = document.getElementById("codigoRemoto").value.trim();
  if (!canal) return mostrarNotificacion("⚠️ Escribe el código del otro usuario");

  try {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    
    // Generamos un UID numérico aleatorio para Agora
    const uidProvisional = Math.floor(Math.random() * 100000);
    const token = await obtenerToken(canal, uidProvisional);

    if (!token) return;

    myAgoraUID = await client.join(APP_ID, canal, token, uidProvisional);

    mostrarNotificacion(`✅ Conectado al canal: ${canal} (Mi UID: ${myAgoraUID})`);

    
    socket = io(BACKEND_URL); 

    socket.on('connect', () => {
        console.log("✅ Conectado al Socket de Railway");
       
        socket.emit('register', myAgoraUID);
    });

    
    socket.on('chat', (data) => {
        
        try {
            const comando = JSON.parse(data.message);
            
            
            if (comando.type) {
                manejarEventosSistema(comando.type, data.from);
                return; 
            }
        } catch (e) {
            
        }

        
        mostrarMensaje(data.message, false, `UID ${data.from}`);
    });

    socket.on('user-disconnected', (data) => {
        mostrarNotificacion(`❌ Usuario UID ${data.from} se desconectó.`);
       
        document.getElementById(`remote-player-${data.from}`)?.remove();
    });

    

   
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
        
        const existingDiv = document.getElementById(`remote-player-${user.uid}`);
        if(existingDiv) existingDiv.remove();

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

    client.on("user-left", (user) => {
      mostrarNotificacion(`❌ Usuario UID ${user.uid} salió de la llamada.`);
      document.getElementById(`remote-player-${user.uid}`)?.remove();
    });

  } catch (err) {
    console.error("Error al unirse al canal:", err);
    mostrarNotificacion("❌ Error al unirse a la videollamada.");
  }
}

// 🌟 MANEJAR EVENTOS VISUALES 
function manejarEventosSistema(tipo, uidRemoto) {
    if (tipo === "mute") mostrarNotificacion(`🔇 Usuario UID ${uidRemoto} silenció su micrófono.`);
    else if (tipo === "unmute") mostrarNotificacion(`🎤 Usuario UID ${uidRemoto} activó su micrófono.`);
    else if (tipo === "video-off") mostrarNotificacion(`🚫 Usuario UID ${uidRemoto} apagó su cámara.`);
    else if (tipo === "video-on") mostrarNotificacion(`📷 Usuario UID ${uidRemoto} encendió su cámara.`);
}

// 🌟 SALIR DE LA LLAMADA
async function salirLlamada() {
  if (!client) return;
  try {
    localTracks.forEach(track => {
      track.stop();
      track.close();
    });
    localTracks = [];
    await client.leave();
    
   
    if(socket) socket.disconnect();

    document.getElementById("remote-streams").innerHTML = "";
    document.getElementById("local-stream").innerHTML = "";

    mostrarNotificacion("📴 Has salido de la llamada.");
    setTimeout(() => window.location.reload(), 2000); // Recargar para limpiar todo
  } catch (error) {
    console.error("Error al salir de la llamada:", error);
  }
}

// 🌟 MUTE/UNMUTE
async function toggleMute() {
  if (!localTracks.length) return;

  const audioTrack = localTracks[0];
  if (micMuted) {
    await audioTrack.setEnabled(true);
    micMuted = false;
    document.getElementById("muteBtn").innerText = "🔊 Silenciar";
    enviarEstadoSistema("unmute");
  } else {
    await audioTrack.setEnabled(false);
    micMuted = true;
    document.getElementById("muteBtn").innerText = "🔇 Activar micrófono";
    enviarEstadoSistema("mute");
  }
}

// 🌟 VIDEO ON/OFF
async function toggleVideo() {
  if (localTracks.length < 2) return;

  const videoTrack = localTracks[1];
  if (videoMuted) {
    await videoTrack.setEnabled(true);
    videoMuted = false;
    document.getElementById("videoBtn").innerText = "📷 Apagar cámara";
    enviarEstadoSistema("video-on");
  } else {
    await videoTrack.setEnabled(false);
    videoMuted = true;
    document.getElementById("videoBtn").innerText = "🚫 Encender cámara";
    enviarEstadoSistema("video-off");
  }
}


function enviarEstadoSistema(tipo) {
    if(!socket) return;
  
    socket.emit('chat', { 
        message: JSON.stringify({ type: tipo }) 
    });
}

// 🌟 ENVÍO DE MENSAJE DE CHAT
function enviarMensaje() {
  const input = document.getElementById("chat-input");
  const mensaje = input.value.trim();
  if (!mensaje || !socket) return;

  socket.emit('chat', {
    message: mensaje
  });

  mostrarMensaje(mensaje, true);
  input.value = "";
}

// 🌟 NOTIFICACIONES
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

// 🌟 MOSTRAR MENSAJE EN EL CHAT
function mostrarMensaje(texto, propio = false, remitente = "Usuario") {
  const contenedor = document.getElementById("chat-mensajes");
  const div = document.createElement("div");

  div.classList.add("chat-mensaje");
  if (propio) div.classList.add("chat-mensaje-propio");

  div.innerText = propio ? texto : `${remitente}: ${texto}`;

  contenedor.appendChild(div);
  contenedor.scrollTop = contenedor.scrollHeight;
}