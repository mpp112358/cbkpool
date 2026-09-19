import { loginWithGoogle } from '../firebase';

export function renderLoginView(container) {
  container.innerHTML = `
    <div class="login-view">
      <h1>cbkpool</h1>
      <p>Sistema de Reserva de Chromebook</p>
      <button id="login-btn" class="btn btn-primary btn-large">
        🔑 Acceda con Google
      </button>
      <div id="login-error" class="alert alert-danger hidden" style="margin-top: 20px;"></div>
    </div>
  `;

  document.getElementById('login-btn').addEventListener('click', async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      const errBox = document.getElementById('login-error');
      errBox.textContent = "Error de acceso: " + err.message;
      errBox.classList.remove('hidden');
    }
  });
}
