// Pricing utility functions for Asha Bani Dandiya Raas 2025

// Phase dates configuration
export const PHASE_DATES = {
  early_bird: {
    start: new Date('2025-08-16'),
    end: new Date('2025-08-29'),
    name: 'Early Bird'
  },
  phase1: {
    start: new Date('2025-08-30'),
    end: new Date('2025-09-15'),
    name: 'Phase 1'
  },
  phase2: {
    start: new Date('2025-09-16'),
    end: new Date('2025-09-21'),
    name: 'Phase 2'
  },
  phase3: {
    start: new Date('2025-09-22'),
    end: new Date('2025-09-28'),
    name: 'Phase 3'
  }
};

// Pricing configuration
export const PRICING = {
  early_bird: {
    ladies: 399,
    child: 199
  },
  phase1: {
    ladies: 429,
    child: 199
  },
  phase2: {
    ladies: 459,
    child: 199
  },
  phase3: {
    ladies: 499,
    child: 199
  }
};

/**
 * Get the current phase based on the current date
 * @returns {string} The current phase ('early_bird', 'phase1', 'phase2', 'phase3')
 */
export const getCurrentPhase = () => {
  const now = new Date();
  
  // Reset time to start of day for accurate comparison
  now.setHours(0, 0, 0, 0);
  
  // Reset phase dates to start of day for accurate comparison
  const earlyBirdStart = new Date(PHASE_DATES.early_bird.start);
  earlyBirdStart.setHours(0, 0, 0, 0);
  const earlyBirdEnd = new Date(PHASE_DATES.early_bird.end);
  earlyBirdEnd.setHours(0, 0, 0, 0);
  
  const phase1Start = new Date(PHASE_DATES.phase1.start);
  phase1Start.setHours(0, 0, 0, 0);
  const phase1End = new Date(PHASE_DATES.phase1.end);
  phase1End.setHours(0, 0, 0, 0);
  
  const phase2Start = new Date(PHASE_DATES.phase2.start);
  phase2Start.setHours(0, 0, 0, 0);
  const phase2End = new Date(PHASE_DATES.phase2.end);
  phase2End.setHours(0, 0, 0, 0);
  
  const phase3Start = new Date(PHASE_DATES.phase3.start);
  phase3Start.setHours(0, 0, 0, 0);
  const phase3End = new Date(PHASE_DATES.phase3.end);
  phase3End.setHours(0, 0, 0, 0);
  
  if (now >= earlyBirdStart && now <= earlyBirdEnd) {
    return 'early_bird';
  }
  
  if (now >= phase1Start && now <= phase1End) {
    return 'phase1';
  }
  
  if (now >= phase2Start && now <= phase2End) {
    return 'phase2';
  }
  
  if (now >= phase3Start && now <= phase3End) {
    return 'phase3';
  }
  
  // Default to phase3 if outside all phases
  return 'phase3';
};

/**
 * Get the current phase name
 * @returns {string} The current phase name
 */
export const getCurrentPhaseName = () => {
  const phase = getCurrentPhase();
  return PHASE_DATES[phase].name;
};

/**
 * Get the ladies pass price for the current phase
 * @returns {number} The current ladies pass price
 */
export const getCurrentLadiesPrice = () => {
  const phase = getCurrentPhase();
  return PRICING[phase].ladies;
};

/**
 * Get the child pass price (fixed across all phases)
 * @returns {number} The child pass price
 */
export const getChildPrice = () => {
  return PRICING.early_bird.child; // Same price across all phases
};

/**
 * Calculate total amount for a booking
 * @param {number} childrenCount - Number of children
 * @returns {number} Total amount
 */
export const calculateTotal = (childrenCount = 0) => {
  const ladiesPrice = getCurrentLadiesPrice();
  const childPrice = getChildPrice();
  return ladiesPrice + (childrenCount * childPrice);
};

/**
 * Check if a phase is currently active (within its date range)
 * @param {string} phaseKey - The phase key to check
 * @returns {boolean} True if the phase is currently active
 */
export const isPhaseCurrentlyActive = (phaseKey) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const phase = PHASE_DATES[phaseKey];
  if (!phase) return false;
  
  const startDate = new Date(phase.start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(phase.end);
  endDate.setHours(0, 0, 0, 0);
  
  return now >= startDate && now <= endDate;
};

/**
 * Get all phase information for display
 * @returns {Array} Array of phase objects with dates and prices
 */
export const getAllPhases = () => {
  return Object.entries(PHASE_DATES).map(([key, phase]) => ({
    key,
    name: phase.name,
    startDate: phase.start,
    endDate: phase.end,
    ladiesPrice: PRICING[key].ladies,
    childPrice: PRICING[key].child,
    isCurrent: key === getCurrentPhase(),
    isActive: isPhaseCurrentlyActive(key)
  }));
};

/**
 * Check if a specific phase is currently active
 * @param {string} phaseKey - The phase key to check
 * @returns {boolean} True if the phase is currently active
 */
export const isPhaseActive = (phaseKey) => {
  return getCurrentPhase() === phaseKey;
};

/**
 * Get the next phase information
 * @returns {Object|null} Next phase information or null if no next phase
 */
export const getNextPhase = () => {
  const currentPhase = getCurrentPhase();
  const phases = ['early_bird', 'phase1', 'phase2', 'phase3'];
  const currentIndex = phases.indexOf(currentPhase);
  
  if (currentIndex < phases.length - 1) {
    const nextPhaseKey = phases[currentIndex + 1];
    return {
      key: nextPhaseKey,
      name: PHASE_DATES[nextPhaseKey].name,
      startDate: PHASE_DATES[nextPhaseKey].start,
      ladiesPrice: PRICING[nextPhaseKey].ladies
    };
  }
  
  return null;
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatPhaseDate = (date) => {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Get phase date range for display
 * @param {string} phaseKey - The phase key
 * @returns {string} Formatted date range
 */
export const getPhaseDateRange = (phaseKey) => {
  const phase = PHASE_DATES[phaseKey];
  if (!phase) return '';
  
  const startFormatted = formatPhaseDate(phase.start);
  const endFormatted = formatPhaseDate(phase.end);
  
  return `${startFormatted} - ${endFormatted}`;
};
