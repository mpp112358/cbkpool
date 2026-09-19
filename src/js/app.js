import { auth, writeData, subscribeToData, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { store } from './store';
import { renderLoginView } from './views/login';
import { renderMainReservationView } from './views/mainReservation';
import { renderMakeReservationView } from './views/makeReservation';
import { renderStatisticsView } from './views/statistics';
import { renderConfigView } from './views/config';

export function initApp() {
  const mainContent = document.getElementById('main-content');
  const navbar = document.getElementById('navbar');
  const navLinks = document.getElementById('nav-links');
  const userInfo = document.getElementById('user-info');

  function navigate(view) {
    store.currentView = view;
    render();
  }

  function renderNavbar() {
    if (!store.currentUser || !store.userProfile) {
      navbar.classList.add('hidden');
      return;
    }

    navbar.classList.remove('hidden');
    const isAdmin = store.userProfile.role === 'admin';

    navLinks.innerHTML = `
      <a href="#" id="nav-main" class="${store.currentView === 'main' ? 'active' : ''}">Reservas</a>
      <a href="#" id="nav-stats" class="${store.currentView === 'stats' ? 'active' : ''}">Estadísticas</a>
      ${isAdmin ? `<a href="#" id="nav-config" class="${store.currentView === 'config' ? 'active' : ''}">Configuración</a>` : ''}
    `;

    userInfo.innerHTML = `
      <span>${store.currentUser.email} (${store.userProfile.role})</span>
      <button id="logout-btn" class="btn btn-secondary" style="margin-left: 10px; padding: 6px 12px;">Logout</button>
    `;

    document.getElementById('nav-main')?.addEventListener('click', (e) => { e.preventDefault(); navigate('main'); });
    document.getElementById('nav-stats')?.addEventListener('click', (e) => { e.preventDefault(); navigate('stats'); });
    document.getElementById('nav-config')?.addEventListener('click', (e) => { e.preventDefault(); navigate('config'); });
    document.getElementById('logout-btn')?.addEventListener('click', () => logout());
  }

  function render() {
    renderNavbar();
    mainContent.innerHTML = '';

    if (!store.currentUser) {
      renderLoginView(mainContent);
      return;
    }

    if (!store.userProfile) {
      mainContent.innerHTML = `
        <div class="card" style="text-align: center; margin-top: 50px;">
          <h2>Acceso Denegado</h2>
          <p>Su dirección de correo electrónico (<strong>${store.currentUser.email}</strong>) no ha sido autorizada por el administrador.</p>
          <button id="denied-logout" class="btn btn-primary" style="margin-top: 15px;">Cerrar sesión</button>
        </div>
      `;
      document.getElementById('denied-logout').addEventListener('click', () => logout());
      return;
    }

    switch (store.currentView) {
      case 'main':
        renderMainReservationView(mainContent, navigate);
        break;
      case 'makeReservation':
        renderMakeReservationView(mainContent, navigate);
        break;
      case 'stats':
        renderStatisticsView(mainContent);
        break;
      case 'config':
        renderConfigView(mainContent);
        break;
      default:
        renderMainReservationView(mainContent, navigate);
    }
  }

  async function resolveUserProfile(user) {
    if (!user) return null;
    if (store.allowedUsers[user.uid]) {
      return store.allowedUsers[user.uid];
    }
    const userEmail = user.email.toLowerCase();
    const preApprovedEntry = Object.values(store.preApproved).find(
      (item) => item.email.toLowerCase() === userEmail
    );
    if (preApprovedEntry) {
      const boundProfile = {
        email: user.email,
        role: preApprovedEntry.role || 'teacher',
        customQuota: preApprovedEntry.customQuota || null
      };
      await writeData(`allowedUsers/${user.uid}`, boundProfile);
      return boundProfile;
    }
    return null;
  }

  async function updateAuthStateAndRender() {
    if (store.currentUser) {
      store.userProfile = await resolveUserProfile(store.currentUser);
    } else {
      store.userProfile = null;
    }
    render();
  }

  let unsubscribeListeners = [];

  function startDatabaseSubscriptions() {
    stopDatabaseSubscriptions();

    const paths = ['config', 'pools', 'reservations', 'allowedUsers', 'preApproved'];
    paths.forEach((path) => {
      const unsubscribe = subscribeToData(path, async (val) => {
        if (path === 'config') {
          store.config = { ...store.config, ...val };
        } else {
          store[path] = val || {};
        }
        await updateAuthStateAndRender();
      });
      unsubscribeListeners.push(unsubscribe);
    });
  }

  function stopDatabaseSubscriptions() {
    unsubscribeListeners.forEach( (unsub) => unsub() );
    unsubscribeListeners = [];
  }

  onAuthStateChanged(auth, async (user) => {
    store.currentUser = user;
    if (user) {
      startDatabaseSubscriptions();
    }
    else {
      stopDatabaseSubscriptions();
      store.userProfile = null;
      store.currentView = 'login';
      store.selectedDate = new Date();
      render();
    }
  });
}
