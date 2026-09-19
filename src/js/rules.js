/**
 * Core business rules and calculation logic for Chromebook pool reservations.
 */

// Calculate total system capacity-hours over a 30-day window
export function calculateTotalSystemCapacityHours(pools, config) {
  const totalDevices = Object.values(pools).reduce((sum, p) => sum + p.capacity, 0);
  const slotsPerDay = (config.timeSlots.mon || []).length;
  const totalDays = 30; // 30-day evaluation window for quota limit
  return totalDevices * slotsPerDay * totalDays;
}

// Calculate user's quota usage percentage
export function calculateUserQuotaUsage(userEmail, reservations, pools, config) {
  const totalCapacityHours = calculateTotalSystemCapacityHours(pools, config);
  if (totalCapacityHours === 0) return 0;

  let userDeviceHours = 0;
  const now = new Date();
  
  Object.values(reservations).forEach((res) => {
    if (res.userEmail === userEmail) {
      const resDate = new Date(res.date);
      // Count upcoming or recent reservations within current window
      if (resDate >= now) {
        userDeviceHours += res.totalDevices * 1; // Each slot is 1 unit of slot-time
      }
    }
  });

  return (userDeviceHours / totalCapacityHours) * 100;
}

/**
 * Overflow calculation logic.
 * Tries primary pool, overflows into subsequent pools if capacity exceeded.
 */
export function calculatePoolAllocation(requestedPoolId, requestedCount, pools, existingReservationsForSlot) {
  const sortedPools = Object.values(pools).sort((a, b) => a.order - b.order);
  
  // Calculate remaining capacities for this slot
  const currentCapacities = {};
  sortedPools.forEach(p => {
    let used = 0;
    existingReservationsForSlot.forEach(res => {
      if (res.allocations && res.allocations[p.id]) {
        used += res.allocations[p.id];
      }
    });
    currentCapacities[p.id] = p.capacity - used;
  });

  const allocations = {};
  let remainingNeeded = requestedCount;

  // Reorder pools starting with requestedPoolId
  const primaryPool = sortedPools.find(p => p.id === requestedPoolId);
  const otherPools = sortedPools.filter(p => p.id !== requestedPoolId);
  const poolSequence = [primaryPool, ...otherPools].filter(Boolean);

  for (const pool of poolSequence) {
    if (remainingNeeded <= 0) break;
    const available = currentCapacities[pool.id] || 0;
    if (available > 0) {
      const allocated = Math.min(available, remainingNeeded);
      allocations[pool.id] = allocated;
      remainingNeeded -= allocated;
    }
  }

  return {
    allocations,
    unfulfilled: remainingNeeded,
    isOverflowed: Object.keys(allocations).length > 1
  };
}

/**
 * Validates booking against teacher constraint rules.
 */
export function validateTeacherBooking({
  userRole,
  userEmail,
  requestedCount,
  requestedPoolId,
  userQuotaLimit,
  reservations,
  pools,
  config,
  existingReservationsForSlot,
  targetDate,
  maxFutureWeeks = 4
}) {
  if (userRole === 'admin') return { allowed: true };

  // Rule 1: Quota Exceeded Check
  const currentUsage = calculateUserQuotaUsage(userEmail, reservations, pools, config);
  const addedUsage = (requestedCount / calculateTotalSystemCapacityHours(pools, config)) * 100;
  
  if ((currentUsage + addedUsage) > userQuotaLimit) {
    return {
      allowed: false,
      reason: `¡Ha excedido su cuota! Su límite de reservas es ${userQuotaLimit}%. Por favor, contacte con un administrador para solicitar un aumento de cuota.`
    };
  }

  // Rule 2: Booking too far in future (e.g. > X weeks)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (maxFutureWeeks * 7));
  if (new Date(targetDate) > maxDate) {
    return {
      allowed: false,
      reason: `Teachers cannot make reservations more than ${maxFutureWeeks} weeks into the future. Please make bookings periodically.`
    };
  }

  // Rule 3: Multi-pool rule check
  // Teachers cannot book devices from different pools unless only one pool has devices left after allocation
  const allocationResult = calculatePoolAllocation(requestedPoolId, requestedCount, pools, existingReservationsForSlot);
  
  if (allocationResult.unfulfilled > 0) {
    return {
      allowed: false,
      reason: `No hay suficientes Chromebooks disponibles para satisfacer su solicitud de ${requestedCount} dispositivos.`
    };
  }

  if (allocationResult.isOverflowed) {
    // Check condition: Valid only if preceding pool is completely depleted (0 remaining)
    const primaryAllocated = allocationResult.allocations[requestedPoolId] || 0;
    const primaryCapacity = pools[requestedPoolId].capacity;
    
    // Total currently reserved in primary pool for this slot
    let primaryUsed = 0;
    existingReservationsForSlot.forEach(res => {
      if (res.allocations && res.allocations[requestedPoolId]) {
        primaryUsed += res.allocations[requestedPoolId];
      }
    });

    if (primaryUsed + primaryAllocated < primaryCapacity) {
      return {
        allowed: false,
        reason: "Solo puede reservar dispositivos de varios carros si no quedan dispositivos disponibles en el carro seleccionado como primario."
      };
    }
  }

  return { allowed: true, allocations: allocationResult.allocations };
}
