import { store } from '../store';

export function renderMainReservationView(container, navigate) {
  // Get start of current displayed week
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const currentWeekDays = getWeekDays(store.selectedDate);

  container.innerHTML = `
    <div class="week-controls card">

      <button id="week-back-btn" class="btn btn-secondary"><span style="font-size:1.5em;">◀</span></button>
      <button id="goto-today-btn" class="btn btn-secondary" style="margin-left: 10px;"><span style="font-size:1.5em;">Ir a hoy</span></button>
      <div>
        <span style="margin-right: 15px;"><span class="badge badge-user">Green</span> = Su reserva</span>
        <span><span class="badge badge-other">Grey</span> = Reservas de otros</span>
      </div>
      <button id="open-date-picker-btn" class="btn btn-secondary" style="margin-left: 10px;"><span style="font-size: 1.5em;">📅</span>
      <input id="select-date-input" type="date" style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; margin-left: 10px;"></input></button>
      <button id="week-forward-btn" class="btn btn-secondary" style="margin-left: 10px;"><span style="font-size:1.5em;">▶</span></button>
    </div>

    <div class="calendar-grid">
      <div class="grid-header">Día / Hora</div>
      ${currentWeekDays.map(d =>
`<div class="grid-header` + (todayStr === d.dateStr ? ' grid-header-today' : '') + `">${d.dayName}<br/><small>${d.dateStr}</small></div>`).join('')}

      ${renderGridBody(currentWeekDays)}
    </div>
  `;

  const weekForwardBtn = document.getElementById('week-forward-btn');
  weekForwardBtn.addEventListener('click', () => {
    const d = new Date(store.selectedDate);
    d.setDate(store.selectedDate.getDate() + 7);
    store.selectedDate = d;
    navigate('main');
  });

  const weekBackBtn = document.getElementById('week-back-btn');
  weekBackBtn.addEventListener('click', () => {
    const d = new Date(store.selectedDate);
    d.setDate(store.selectedDate.getDate() - 7);
    store.selectedDate = d;
    navigate('main');
  });

  const gotoTodayBtn = document.getElementById('goto-today-btn');
  gotoTodayBtn.addEventListener('click', () => {
    store.selectedDate = new Date();
    navigate('main');
  });

  const selectDateInput = document.getElementById('select-date-input');
  selectDateInput.addEventListener('change', (e) => {
    let selectedDateStr = e.target.value;
    store.selectedDate = new Date(selectedDateStr);
    navigate('main');
  });

  const openDatePickerBtn = document.getElementById('open-date-picker-btn');
  openDatePickerBtn.addEventListener('click', () => {
    if (selectDateInput.showPicker) {
      selectDateInput.showPicker();
    }
    else {
      selectDateInput.focus();
    }
  });


  // Attach slot click listeners
  container.querySelectorAll('.slot-box:not(.blocked)').forEach(box => {
    box.addEventListener('click', () => {
      const date = box.dataset.date;
      const slotId = box.dataset.slotId;
      store.selectedSlotData = { date, slotId };
      navigate('makeReservation');
    });
  });
}

function getWeekDays(referenceDate) {
  const days = [];
  const start = new Date(referenceDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(start.setDate(diff));

  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateNum = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateNum}`;
    days.push({ dayName: names[i], dateStr });
  }
  return days;
}

function renderGridBody(weekDays) {
  // Use Monday slots configuration
  const timeSlots = store.config.timeSlots?.mon || [];
  
  return timeSlots.map(slot => {
    let slotLabel = slot.label.replace(' - ', '<br>');
    let rowHtml = `<div class="time-slot-label">${slotLabel}</div>`;

    weekDays.forEach(day => {
      const isBlocked = (store.config.blockedDates || []).includes(day.dateStr);
      
      if (isBlocked) {
        rowHtml += `<div class="slot-box blocked"><em>Bloqueado</em></div>`;
        return;
      }

      // Find reservations for date & slot
      const slotRes = Object.values(store.reservations).filter(
        r => r.date === day.dateStr && r.slotId === slot.id
      );

      const userRes = slotRes.find(r => r.userEmail === store.currentUser?.email);
      const totalReserved = slotRes.reduce((sum, r) => sum + r.totalDevices, 0);
      const totalCapacity = Object.values(store.pools).reduce((sum, p) => sum + p.capacity, 0);
      const available = totalCapacity - totalReserved;
      const availablePer = Math.floor(100*available/totalCapacity);

      const isUserBooked = Boolean(userRes);
      const othersBookings = slotRes.length - (isUserBooked ? 1 : 0);
      const othersTotalReserved = totalReserved - (isUserBooked ? userRes.totalDevices : 0);
      const boxClass = isUserBooked ? 'slot-box user-booked' : 'slot-box';

      rowHtml += `
        <div class="${boxClass}" style="background: linear-gradient(to right, var(--available) 0%, var(--available) ${availablePer}%, var(--unavailable) ${availablePer}%, var(--unavailable) 100%); " data-date="${day.dateStr}" data-slot-id="${slot.id}">
          <div style="font-weight: bold; font-size: 0.9rem;">Disponibles: ${available}/${totalCapacity}</div>
          ${isUserBooked ? `<span class="badge badge-user">Reservados: ${userRes.totalDevices}</span>` : ''}
          ${othersBookings > 0 ? `<span class="badge badge-other">${othersBookings} reserva(s): ${othersTotalReserved}</span>` : ''}
        </div>
      `;
    });

    return rowHtml;
  }).join('');
}
