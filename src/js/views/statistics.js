import { store } from '../store';
import { calculateUserQuotaUsage } from '../rules';

export function renderStatisticsView(container) {
  const isAdmin = store.userProfile?.role === 'admin';
  const currentUserUsage = calculateUserQuotaUsage(
    store.currentUser.email,
    store.reservations,
    store.pools,
    store.config
  ).toFixed(2);

  const userQuota = store.userProfile?.customQuota || store.config.defaultQuota;

  container.innerHTML = `
    <div class="card">
      <h2>📊 Personal Usage Statistics</h2>
      <p><strong>Your Current Booking Quota:</strong> ${currentUserUsage}% / ${userQuota}%</p>
    </div>

    ${isAdmin ? renderAdminStatsTable() : ''}
  `;
}

function renderAdminStatsTable() {
  const users = Object.values(store.allowedUsers);
  let globalDeviceHours = 0;

  Object.values(store.reservations).forEach(r => globalDeviceHours += r.totalDevices);

  return `
    <div class="card">
      <h2>🌐 Global & Per-User Statistics (Admin View)</h2>
      <table>
        <thead>
          <tr><th>User Email</th><th>Role</th><th>Quota Limit</th><th>Current Quota Used</th></tr>
        </thead>
        <tbody>
          <tr style="background: #f1f5f9; font-weight: bold;">
            <td>GLOBAL TOTAL</td>
            <td>-</td>
            <td>100%</td>
            <td>Total Reserved Devices: ${globalDeviceHours}</td>
          </tr>
          ${users.map(u => {
            const usage = calculateUserQuotaUsage(u.email, store.reservations, store.pools, store.config).toFixed(2);
            return `
              <tr>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>${u.customQuota || store.config.defaultQuota}%</td>
                <td>${usage}%</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}