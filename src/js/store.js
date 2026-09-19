export const store = {
  currentUser: null,      // Auth user object
  userProfile: null,      // Profile from DB (allowedUsers)
  pools: {},
  reservations: {},
  config: {
    defaultQuota: 15,
    maxFutureWeeks: 4,
    blockedDates: [],
    timeSlots: {
      mon: [{ id: "slot1", label: "08:30 - 09:30" }, { id: "slot2", label: "09:30 - 10:30" }],
      tue: [{ id: "slot1", label: "08:30 - 09:30" }, { id: "slot2", label: "09:30 - 10:30" }],
      wed: [{ id: "slot1", label: "08:30 - 09:30" }, { id: "slot2", label: "09:30 - 10:30" }],
      thu: [{ id: "slot1", label: "08:30 - 09:30" }, { id: "slot2", label: "09:30 - 10:30" }],
      fri: [{ id: "slot1", label: "08:30 - 09:30" }, { id: "slot2", label: "09:30 - 10:30" }]
    }
  },
  allowedUsers: {},
  preApproved: {},
  currentView: 'login',
  selectedSlotData: null, // For navigating to makeReservation view
  selectedDate: new Date()
};
