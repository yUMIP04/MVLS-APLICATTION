//🌟GENERACION DE TOKENS DE AGORA
require('dotenv').config();
const express = require("express");//🌟PARA CREAR SERVIDOR HTTP
const cors = require("cors");//🌟PARA QUE EL CLIENTE HAGA PETICIONES
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");//🌟IMPORTA FUNCIONES DE AGORA PARA GENERAR TOKENS SEGUROS

const app = express();
app.use(cors());

//🌟VARIABLES DE LAS CREDENCIALES DE AGORA
const APP_ID =  process.env.APP_ID;
const APP_CERTIFICATE =  process.env.APP_CERTIFICATE;

//🌟AGORA ASIGNA UN UID PARA LA TRANSMISION DE VIDEO Y AUDIO, EL TOKEN DURARA 1 HORA Y GENERA UN TOKEN UNICO
app.get("/access_token", (req, res) => {
  const channelName = req.query.channelName;
  const uid = req.query.uid || 0;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; //🌟1 HORA DE PERMISOS
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  if (!channelName) {
    return res.status(400).json({ error: "Falta channelName" });
  }

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );

  return res.json({ token });
});

//🌟ESCUCHA EL PUERTO 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
//🌟GENERA UN TOKEN SEGURO USANDO LA APP_ID Y LA APP_CERTIFICATE DE AGORA
//🌟ASIGNHA UN UID UNICO PARA CADA USARIO Y LE DA UN TOKEN PARA UNIRSE A LA LLAMADA