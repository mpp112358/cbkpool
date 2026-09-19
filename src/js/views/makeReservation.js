import { store } from '../store';
import { validateTeacherBooking, calculatePoolAllocation } from '../rules';
import { writeData, deleteData } from '../firebase';

function slotLabel(slotId) {
  let slot = store.config.timeSlots.mon.filter(s => s.id === slotId);
  if (slot) {
    return slot[0].label;
  }
  return null;
}

export function renderMakeReservationView(container, navigate) {
  const { date, slotId } = store.selectedSlotData || {};
  if (!date || !slotId) {
    navigate('main');
    return;
  }
  const dateObj = new Date(date);

  const existingSlotReservations = Object.values(store.reservations).filter(
    r => r.date === date && r.slotId === slotId
  );

  const currentUserRes = existingSlotReservations.find(r => r.userEmail === store.currentUser.email);
  const isAdmin = store.userProfile?.role === 'admin';

  container.innerHTML = `
    <button id="back-btn" class="btn btn-secondary" style="margin-bottom: 20px;">← Volver a Semana</button>
    
    <div class="card">
      <h2>${dateObj.toLocaleDateString("es-ES", {weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric'})} (${slotLabel(slotId)})</h2>
      <div id="alert-box" class="alert hidden"></div>

      <form id="res-form" style="margin-top: 20px;">
        ${isAdmin ? `
          <div class="form-group">
            <label>Reserve on behalf of (Email):</label>
            <select id="behalf-email">
              ${Object.values(store.allowedUsers).map(u => `<option value="${u.email}" ${u.email === store.currentUser.email ? 'selected' : ''}>${u.email} (${u.role})</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <div class="form-group">
          <label>Carro preferido:</label>
          <select id="pool-select">
            ${Object.values(store.pools).map(p => `<option value="${p.id}">${p.name} (Cap: ${p.capacity})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Número de dispositivos:</label>
          <input type="number" id="device-count" min="1" value="${currentUserRes ? currentUserRes.totalDevices : 1}" required />
        </div>

        <div style="display: flex; gap: 10px;">
          <button type="submit" class="btn btn-primary">${currentUserRes ? 'Modificar reserva' : 'Reservar'}</button>
          ${currentUserRes ? `<button type="button" id="delete-res-btn" class="btn btn-danger">Cancelar reserva</button>` : ''}
        </div>
      </form>
    </div>

    <div class="card">
      <h3>Reservas para esta hora</h3>
      <table>
        <thead>
          <tr><th>Usuario</th><th>Dispositivos</th><th>Carros</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          ${existingSlotReservations.map(r => `
          <tr>
              <td${(r.userEmail === store.currentUser.email) ? ' class="tr-own-reservation"' : ''}>${r.userEmail}</td>
              <td${(r.userEmail === store.currentUser.email) ? ' class="tr-own-reservation"' : ''}>${r.totalDevices}</td>
              <td${(r.userEmail === store.currentUser.email) ? ' class="tr-own-reservation"' : ''}><small>${JSON.stringify(r.allocations)}</small></td>
              <td${(r.userEmail === store.currentUser.email) ? ' class="tr-own-reservation"' : ''}>
                ${(isAdmin || r.userEmail === store.currentUser.email) ? 
                  `<button class="btn btn-danger btn-sm delete-btn" data-id="${r.id}">Cancelar</button>` :
                  '<em>Solo lectura</em>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => navigate('main'));

  // Handle Create / Update
  document.getElementById('res-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('alert-box');
    alertBox.classList.add('hidden');

    const targetUserEmail = isAdmin ? document.getElementById('behalf-email').value : store.currentUser.email;
    const targetUserProfile = Object.values(store.allowedUsers).find(u => u.email === targetUserEmail) || store.userProfile;
    const poolId = document.getElementById('pool-select').value;
    const count = parseInt(document.getElementById('device-count').value, 10);

    const userQuota = targetUserProfile.customQuota || store.config.defaultQuota;

    const validation = validateTeacherBooking({
      userRole: targetUserProfile.role,
      userEmail: targetUserEmail,
      requestedCount: count,
      requestedPoolId: poolId,
      userQuotaLimit: userQuota,
      reservations: store.reservations,
      pools: store.pools,
      config: store.config,
      existingReservationsForSlot: existingSlotReservations.filter(r => r.userEmail !== targetUserEmail),
      targetDate: date,
      maxFutureWeeks: store.config.maxFutureWeeks
    });

    if (!validation.allowed) {
      alertBox.textContent = validation.reason;
      alertBox.className = "alert alert-warning";
      alertBox.classList.remove('hidden');
      return;
    }

    const allocations = validation.allocations || calculatePoolAllocation(poolId, count, store.pools, existingSlotReservations).allocations;
    const resId = currentUserRes ? currentUserRes.id : `res_${Date.now()}`;

    const newRes = {
      id: resId,
      userEmail: targetUserEmail,
      date,
      slotId,
      allocations,
      totalDevices: count,
      createdAt: Date.now()
    };

    await writeData(`reservations/${resId}`, newRes);
    navigate('main');
  });

  // Handle Delete
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const resId = btn.dataset.id;
      if (confirm('Cancel this reservation?')) {
        await deleteData(`reservations/${resId}`);
        renderMakeReservationView(container, navigate);
      }
    });
  });

  const deleteResBtn = document.getElementById('delete-res-btn');
  if (deleteResBtn && currentUserRes) {
    deleteResBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to cancel this reservation?')) {
        await deleteData(`reservations/${currentUserRes.id}`);
        delete store.reservations[currentUserRes.id];
        navigate('main');
      }
    });
  }
}
