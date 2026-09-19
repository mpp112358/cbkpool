import { store } from '../store';
import { writeData, updateData } from '../firebase';

export function renderConfigView(container) {
  if (store.userProfile?.role !== 'admin') {
    container.innerHTML = `<div class="alert alert-danger">Access Denied: Admin role required.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <h2>⚙️ System Rules & Parameters</h2>
      <form id="config-rules-form">
        <div class="form-group">
          <label>Default Quota (%) for Teachers:</label>
          <input type="number" id="defaultQuota" value="${store.config.defaultQuota || 15}" min="1" max="100" />
        </div>
        <div class="form-group">
          <label>Max Future Reservation Weeks (X time into future limit):</label>
          <input type="number" id="maxFutureWeeks" value="${store.config.maxFutureWeeks || 4}" min="1" />
        </div>
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </form>
    </div>

    <div class="card">
      <h2>👥 Allowed Users & Roles</h2>
      <form id="add-user-form" style="display: flex; gap: 10px; margin-bottom: 15px;">
        <input type="email" id="new-user-email" placeholder="user@school.edu" required />
        <select id="new-user-role">
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" class="btn btn-primary">Add/Update User</button>
      </form>

      <table>
        <thead><tr><th>Email</th><th>Role</th><th>Quota Override (%)</th></tr></thead>
        <tbody>
          ${Object.values(store.allowedUsers).map(u => `
            <tr>
              <td>${u.email}</td>
              <td>${u.role}</td>
              <td>${u.customQuota || 'Default (' + store.config.defaultQuota + '%)'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>🏊 Chromebook Pools</h2>
      <form id="add-pool-form" style="display: flex; gap: 10px; margin-bottom: 15px;">
        <input type="text" id="pool-name" placeholder="Pool Name (e.g. Floor 1 Locker)" required />
        <input type="number" id="pool-capacity" placeholder="Capacity" min="1" required />
        <button type="submit" class="btn btn-primary">Add Pool</button>
      </form>

      <table>
        <thead><tr><th>Pool Name</th><th>Capacity</th></tr></thead>
        <tbody>
          ${Object.values(store.pools).map(p => `
            <tr><td>${p.name}</td><td>${p.capacity}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // System parameters save
  document.getElementById('config-rules-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const defaultQuota = parseInt(document.getElementById('defaultQuota').value, 10);
    const maxFutureWeeks = parseInt(document.getElementById('maxFutureWeeks').value, 10);
    await updateData('config', { defaultQuota, maxFutureWeeks });
    alert('System settings updated!');
  });

  // User management
  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-user-email').value.toLowerCase().trim();
    const role = document.getElementById('new-user-role').value;
    const key = email.replace(/[^a-zA-Z0-9]/g, '_');

    await writeData(`allowedUsers/${key}`, { email, role });
    renderConfigView(container);
  });

  // Pool management
  document.getElementById('add-pool-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pool-name').value;
    const capacity = parseInt(document.getElementById('pool-capacity').value, 10);
    const poolId = `pool_${Date.now()}`;
    const order = Object.keys(store.pools).length + 1;

    await writeData(`pools/${poolId}`, { id: poolId, name, capacity, order });
    renderConfigView(container);
  });

  // Add pre-approved emails
  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-user-email').value.toLowerCase().trim();
    const role = document.getElementById('new-user-role').value;
    const key = email.replace(/[^a-zA-Z0-9]/g, '_');
    await writeData(`preApproved/${key}`, {
      email,
      role,
      createdAt: Date.now()
    });
    alert(`Pre-approval added for ${email} as ${role}. They can now sign in.`);
    renderConfigView(container);
  });
}
