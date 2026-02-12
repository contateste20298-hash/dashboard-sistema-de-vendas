import { addMinutes, areIntervalsOverlapping, format, parseISO, getDay } from 'date-fns';

export const SLOT_DURATION = 60; // Fixed 60 minutes duration
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 18;

/**
 * Generates default time slots (e.g., "09:00", "10:00") for the work day.
 * Used as a fallback when no specific availability is configured.
 */
export const generateTimeSlots = (startHour = WORK_START_HOUR, endHour = WORK_END_HOUR) => {
  const slots = [];
  for (let i = startHour; i < endHour; i++) {
    const h = i.toString().padStart(2, '0');
    slots.push(`${h}:00`);
    // If we wanted 30 min slots: slots.push(`${h}:30`);
  }
  return slots;
};

/**
 * Generates time slots based on user configured availability intervals.
 * @param {Array} availabilities - List of { time_start, time_end } objects
 */
export const generateSlotsFromAvailability = (availabilities = []) => {
  const slots = [];
  
  availabilities.forEach(interval => {
    // Parse times (assuming "HH:mm:ss" or "HH:mm")
    const [startH, startM] = interval.time_start.split(':').map(Number);
    const [endH, endM] = interval.time_end.split(':').map(Number);
    
    // Convert to minutes for easier calculation
    let currentTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    
    while (currentTotalMinutes + SLOT_DURATION <= endTotalMinutes) {
      const h = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
      const m = (currentTotalMinutes % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      
      currentTotalMinutes += SLOT_DURATION;
    }
  });
  
  // Sort slots chronologically
  return slots.sort();
};

/**
 * Merges Google Calendar busy intervals with internal database appointments.
 * Returns a unified list of { start: ISOString, end: ISOString }
 */
export const getCombinedBusyIntervals = (googleBusy = [], internalAppts = []) => {
  // Defensive check: ensure inputs are arrays
  const safeGoogleBusy = Array.isArray(googleBusy) ? googleBusy : [];
  const safeInternalAppts = Array.isArray(internalAppts) ? internalAppts : [];

  const intervals = safeGoogleBusy.map(b => ({
    start: b.start,
    end: b.end,
    source: 'google'
  }));

  safeInternalAppts.forEach(appt => {
    // Determine end time: prioritize end_time column, fallback to duration, fallback to SLOT_DURATION
    let end;
    if (appt.end_time) {
      end = new Date(appt.end_time);
    } else {
      const start = new Date(appt.scheduled_at);
      const duration = appt.duration || SLOT_DURATION;
      end = addMinutes(start, duration);
    }

    intervals.push({ 
      start: appt.scheduled_at, 
      end: end.toISOString(),
      source: 'internal'
    });
  });

  return intervals;
};

/**
 * Centralized availability checker.
 * Filters potential time slots against a list of busy intervals.
 */
export const filterAvailableSlots = (dateStr, timeSlots, busyIntervals, durationMinutes = SLOT_DURATION) => {
  // Defensive checks
  if (!dateStr || !Array.isArray(timeSlots)) return [];
  const safeBusyIntervals = Array.isArray(busyIntervals) ? busyIntervals : [];

  console.group(`Filtering Slots for ${dateStr} (Duration: ${durationMinutes}m)`);
  
  const results = timeSlots.map(time => {
    // Force America/Sao_Paulo timezone offset (-03:00)
    // This ensures that "09:00" is interpreted as 09:00 SP time
    const slotStart = new Date(`${dateStr}T${time}:00-03:00`);
    const slotEnd = addMinutes(slotStart, durationMinutes);

    let isBlocked = false;
    let blockingSource = null;

    for (const interval of safeBusyIntervals) {
      if (!interval.start || !interval.end) continue;

      const busyStart = new Date(interval.start);
      const busyEnd = new Date(interval.end);

      // Check strict overlap (inclusive: false ensures 14:00-15:00 doesn't block 15:00-16:00)
      if (areIntervalsOverlapping(
        { start: slotStart, end: slotEnd },
        { start: busyStart, end: busyEnd },
        { inclusive: false }
      )) {
        isBlocked = true;
        blockingSource = interval.source;
        break; // Optimization: stop checking once blocked
      }
    }

    return { time, available: !isBlocked, blockingSource };
  });

  const availableCount = results.filter(r => r.available).length;
  console.log(`Total Slots: ${results.length}, Available: ${availableCount}`);
  console.groupEnd();

  return results;
};