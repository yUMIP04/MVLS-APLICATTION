const information = document.getElementById('info');
information.innerText = `This app is using Chrome (v${window.versions.chrome()}), Node.js (v${window.versions.node()}), and Electron (v${window.versions.electron()})`;

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo = document.getElementById('correo').value;
  const contraseña = document.getElementById('contraseña').value; // coincide con la columna
  const mensaje = document.getElementById('mensaje');

  console.log("Formulario enviado con:", correo, contraseña);

  const resultado = await window.api.verificarLogin(correo, contraseña);

  if (resultado.exito) {
    mensaje.textContent = 'Inicio de sesión exitoso';
    mensaje.style.color = 'green';

    setTimeout(() => {
      window.api.cargarInicio();
    }, 300);
  } else {
    mensaje.textContent = resultado.mensaje || 'Correo o contraseña incorrectos';
    mensaje.style.color = 'red';
  }
});
