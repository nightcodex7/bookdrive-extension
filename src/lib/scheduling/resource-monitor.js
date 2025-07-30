/**
 * resource-monitor.js - System resource monitoring for BookDrive
 *
 * This module provides functions for monitoring system resources
 * to determine if operations like backups can be performed safely.
 */

// Resource state constants
export const RESOURCE_STATE = {
  OPTIMAL: 'optimal',
  CONSTRAINED: 'constrained',
  CRITICAL: 'critical',
};

// Default thresholds
const DEFAULT_THRESHOLDS = {
  battery: {
    critical: 15, // Below 15% is critical
    constrained: 30, // Below 30% is constrained
  },
  memory: {
    critical: 90, // Above 90% usage is critical
    constrained: 80, // Above 80% usage is constrained
  },
  cpu: {
    critical: 90, // Above 90% usage is critical
    constrained: 70, // Above 70% usage is constrained
  },
};

/**
 * Get the current system state
 * @returns {Promise<Object>} System state information
 */
export async function getSystemState() {
  try {
    // Get battery information if available
    const batteryInfo = await getBatteryInfo();

    // Get memory usage
    const memoryInfo = await getMemoryInfo();

    // Get CPU usage
    const cpuInfo = await getCpuInfo();

    // Get network status
    const networkInfo = await getNetworkInfo();

    // Determine overall state
    const state = determineResourceState(batteryInfo, memoryInfo, cpuInfo, networkInfo);

    return {
      timestamp: new Date().toISOString(),
      state: state.state,
      reason: state.reason,
      details: {
        battery: batteryInfo,
        memory: memoryInfo,
        cpu: cpuInfo,
        network: networkInfo,
      },
    };
  } catch (error) {
    console.error('Failed to get system state:', error);
    return {
      timestamp: new Date().toISOString(),
      state: RESOURCE_STATE.OPTIMAL, // Default to optimal if we can't determine
      reason: 'Unable to determine system state',
      details: {
        error: error.message,
      },
    };
  }
}

/**
 * Check if an operation can be performed based on system resources
 * @param {Object} options Check options
 * @param {boolean} options.requireOptimal Whether optimal resources are required
 * @param {boolean} options.allowConstrained Whether constrained resources are allowed
 * @param {boolean} options.checkBattery Whether to check battery status
 * @param {boolean} options.checkNetwork Whether to check network status
 * @param {boolean} options.checkPerformance Whether to check CPU/memory performance
 * @returns {Promise<Object>} Result with isSafe flag and reason if unsafe
 */
export async function canPerformOperation(options = {}) {
  try {
    const defaultOptions = {
      requireOptimal: false,
      allowConstrained: true,
      checkBattery: true,
      checkNetwork: true,
      checkPerformance: true,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Get system state
    const systemState = await getSystemState();

    // If optimal resources are required, only allow OPTIMAL state
    if (mergedOptions.requireOptimal && systemState.state !== RESOURCE_STATE.OPTIMAL) {
      return {
        isSafe: false,
        reason: `Optimal resources required, but system state is ${systemState.state}: ${systemState.reason}`,
        systemState,
      };
    }

    // If constrained resources are not allowed, only allow OPTIMAL state
    if (!mergedOptions.allowConstrained && systemState.state !== RESOURCE_STATE.OPTIMAL) {
      return {
        isSafe: false,
        reason: `Constrained resources not allowed, but system state is ${systemState.state}: ${systemState.reason}`,
        systemState,
      };
    }

    // Never allow operations in CRITICAL state
    if (systemState.state === RESOURCE_STATE.CRITICAL) {
      return {
        isSafe: false,
        reason: `System resources are critical: ${systemState.reason}`,
        systemState,
      };
    }

    // Check specific resources if requested
    if (mergedOptions.checkBattery && systemState.details.battery) {
      if (systemState.details.battery.level <= DEFAULT_THRESHOLDS.battery.critical) {
        return {
          isSafe: false,
          reason: `Battery level is too low: ${systemState.details.battery.level}%`,
          systemState,
        };
      }
    }

    if (mergedOptions.checkNetwork && systemState.details.network) {
      if (!systemState.details.network.online) {
        return {
          isSafe: false,
          reason: 'Device is offline',
          systemState,
        };
      }
    }

    // All checks passed
    return {
      isSafe: true,
      systemState,
    };
  } catch (error) {
    console.error('Failed to check if operation can be performed:', error);

    // Default to safe in case of error
    return {
      isSafe: true,
      reason: 'Unable to determine system resources',
      error: error.message,
    };
  }
}

/**
 * Get battery information
 * @returns {Promise<Object|null>} Battery information or null if not available
 */
async function getBatteryInfo() {
  try {
    // Check if Battery API is available
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();

      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };
    }

    // Battery API not available
    return null;
  } catch (error) {
    console.error('Failed to get battery info:', error);
    return null;
  }
}

/**
 * Get memory information
 * @returns {Promise<Object|null>} Memory information or null if not available
 */
async function getMemoryInfo() {
  try {
    // Check if Performance API is available
    if ('memory' in performance) {
      const memory = performance.memory;

      return {
        total: memory.jsHeapSizeLimit,
        used: memory.usedJSHeapSize,
        usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      };
    }

    // Memory API not available
    return null;
  } catch (error) {
    console.error('Failed to get memory info:', error);
    return null;
  }
}

/**
 * Get CPU information
 * @returns {Promise<Object|null>} CPU information or null if not available
 */
async function getCpuInfo() {
  // CPU usage is not directly available in browsers
  // This is a placeholder for future implementation
  return null;
}

/**
 * Get network information
 * @returns {Promise<Object>} Network information
 */
async function getNetworkInfo() {
  try {
    // Check if Network Information API is available
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      return {
        online: navigator.onLine,
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlinkMax: connection.downlinkMax,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }

    // Basic network info
    return {
      online: navigator.onLine,
    };
  } catch (error) {
    console.error('Failed to get network info:', error);
    return {
      online: true, // Assume online if we can't determine
    };
  }
}

/**
 * Determine the overall resource state
 * @param {Object} batteryInfo Battery information
 * @param {Object} memoryInfo Memory information
 * @param {Object} cpuInfo CPU information
 * @param {Object} networkInfo Network information
 * @returns {Object} Resource state and reason
 */
function determineResourceState(batteryInfo, memoryInfo, cpuInfo, networkInfo) {
  // Check for critical conditions first

  // Battery critical
  if (
    batteryInfo &&
    batteryInfo.level <= DEFAULT_THRESHOLDS.battery.critical &&
    !batteryInfo.charging
  ) {
    return {
      state: RESOURCE_STATE.CRITICAL,
      reason: `Battery level is critical: ${batteryInfo.level}%`,
    };
  }

  // Memory critical
  if (memoryInfo && memoryInfo.usagePercent >= DEFAULT_THRESHOLDS.memory.critical) {
    return {
      state: RESOURCE_STATE.CRITICAL,
      reason: `Memory usage is critical: ${memoryInfo.usagePercent}%`,
    };
  }

  // CPU critical
  if (cpuInfo && cpuInfo.usagePercent >= DEFAULT_THRESHOLDS.cpu.critical) {
    return {
      state: RESOURCE_STATE.CRITICAL,
      reason: `CPU usage is critical: ${cpuInfo.usagePercent}%`,
    };
  }

  // Network offline
  if (networkInfo && !networkInfo.online) {
    return {
      state: RESOURCE_STATE.CRITICAL,
      reason: 'Device is offline',
    };
  }

  // Check for constrained conditions

  // Battery constrained
  if (
    batteryInfo &&
    batteryInfo.level <= DEFAULT_THRESHOLDS.battery.constrained &&
    !batteryInfo.charging
  ) {
    return {
      state: RESOURCE_STATE.CONSTRAINED,
      reason: `Battery level is low: ${batteryInfo.level}%`,
    };
  }

  // Memory constrained
  if (memoryInfo && memoryInfo.usagePercent >= DEFAULT_THRESHOLDS.memory.constrained) {
    return {
      state: RESOURCE_STATE.CONSTRAINED,
      reason: `Memory usage is high: ${memoryInfo.usagePercent}%`,
    };
  }

  // CPU constrained
  if (cpuInfo && cpuInfo.usagePercent >= DEFAULT_THRESHOLDS.cpu.constrained) {
    return {
      state: RESOURCE_STATE.CONSTRAINED,
      reason: `CPU usage is high: ${cpuInfo.usagePercent}%`,
    };
  }

  // Network constrained
  if (networkInfo && networkInfo.effectiveType === '2g') {
    return {
      state: RESOURCE_STATE.CONSTRAINED,
      reason: 'Network connection is slow',
    };
  }

  // If no constraints, system is optimal
  return {
    state: RESOURCE_STATE.OPTIMAL,
    reason: 'System resources are optimal',
  };
}
