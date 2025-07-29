const information = document.getElementById('info');
information.innerText = `This app is using Chrome (v${window.versions.chrome()}), Node.js (v${window.versions.node()}), and Electron (v${window.versions.electron()})`;

const func = async () => {
  const response = await window.versions.ping();
  console.log(response);
};

func();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo = document.getElementById('correo').value;
  const contraseña = document.getElementById('contraseña').value;

  console.log("Formulario enviado con:", correo, contraseña);

  const resultado = await window.api.verificarLogin(correo, contraseña);
  const mensaje = document.getElementById('mensaje');

  if (resultado.exito) {
  mensaje.textContent = 'Inicio de sesión exitoso';
  mensaje.style.color = 'green';
  window.api.cargarInicio(); // sin argumentos
}else {
    mensaje.textContent = 'Correo o contraseña incorrectos';
    mensaje.style.color = 'red';
  }
});
