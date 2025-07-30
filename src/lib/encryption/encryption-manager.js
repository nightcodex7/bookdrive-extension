/**
 * Encryption Manager Module
 * Handles encryption settings and provides UI for managing encryption
 */

import { encryptData, decryptData, validatePassphrase } from '../encryption.js';

// Storage keys
const ENCRYPTION_KEYS = {
  ENABLED: 'bookDriveEncryptionEnabled',
  PASSPHRASE_HASH: 'bookDrivePassphraseHash',
  SALT: 'bookDriveEncryptionSalt',
  ALGORITHM: 'bookDriveEncryptionAlgorithm',
};

/**
 * Encryption status
 */
export const ENCRYPTION_STATUS = {
  DISABLED: 'disabled',
  ENABLED: 'enabled',
  SETUP_REQUIRED: 'setup_required',
  ERROR: 'error',
};

/**
 * Get encryption status
 * @returns {Promise<Object>} Encryption status
 */
export async function getEncryptionStatus() {
  try {
    const result = await chrome.storage.local.get([
      ENCRYPTION_KEYS.ENABLED,
      ENCRYPTION_KEYS.PASSPHRASE_HASH,
    ]);

    if (!result[ENCRYPTION_KEYS.ENABLED]) {
      return {
        status: ENCRYPTION_STATUS.DISABLED,
        message: 'Encryption is disabled',
      };
    }

    if (!result[ENCRYPTION_KEYS.PASSPHRASE_HASH]) {
      return {
        status: ENCRYPTION_STATUS.SETUP_REQUIRED,
        message: 'Encryption is enabled but passphrase not set',
      };
    }

    return {
      status: ENCRYPTION_STATUS.ENABLED,
      message: 'Encryption is enabled and configured',
    };
  } catch (error) {
    console.error('Failed to get encryption status:', error);
    return {
      status: ENCRYPTION_STATUS.ERROR,
      message: 'Failed to check encryption status',
    };
  }
}

/**
 * Enable encryption
 * @param {string} passphrase - Encryption passphrase
 * @returns {Promise<Object>} Result
 */
export async function enableEncryption(passphrase) {
  try {
    // Validate passphrase
    const validation = validatePassphrase(passphrase);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Invalid passphrase: ' + validation.errors.join(', '),
      };
    }

    // Generate salt and hash passphrase
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);

    // Create a simple hash for verification (not for security)
    const hashBuffer = await crypto.subtle.digest('SHA-256', passphraseData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passphraseHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Save encryption settings
    await chrome.storage.local.set({
      [ENCRYPTION_KEYS.ENABLED]: true,
      [ENCRYPTION_KEYS.PASSPHRASE_HASH]: passphraseHash,
      [ENCRYPTION_KEYS.SALT]: btoa(String.fromCharCode(...salt)),
      [ENCRYPTION_KEYS.ALGORITHM]: 'AES-GCM',
    });

    return {
      success: true,
      message: 'Encryption enabled successfully',
    };
  } catch (error) {
    console.error('Failed to enable encryption:', error);
    return {
      success: false,
      message: 'Failed to enable encryption: ' + error.message,
    };
  }
}

/**
 * Disable encryption
 * @returns {Promise<Object>} Result
 */
export async function disableEncryption() {
  try {
    // Remove encryption settings
    await chrome.storage.local.remove([
      ENCRYPTION_KEYS.ENABLED,
      ENCRYPTION_KEYS.PASSPHRASE_HASH,
      ENCRYPTION_KEYS.SALT,
      ENCRYPTION_KEYS.ALGORITHM,
    ]);

    return {
      success: true,
      message: 'Encryption disabled successfully',
    };
  } catch (error) {
    console.error('Failed to disable encryption:', error);
    return {
      success: false,
      message: 'Failed to disable encryption: ' + error.message,
    };
  }
}

/**
 * Change encryption passphrase
 * @param {string} oldPassphrase - Current passphrase
 * @param {string} newPassphrase - New passphrase
 * @returns {Promise<Object>} Result
 */
export async function changePassphrase(oldPassphrase, newPassphrase) {
  try {
    // Verify old passphrase
    const result = await chrome.storage.local.get([ENCRYPTION_KEYS.PASSPHRASE_HASH]);

    const encoder = new TextEncoder();
    const oldPassphraseData = encoder.encode(oldPassphrase);
    const hashBuffer = await crypto.subtle.digest('SHA-256', oldPassphraseData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const oldHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    if (oldHash !== result[ENCRYPTION_KEYS.PASSPHRASE_HASH]) {
      return {
        success: false,
        message: 'Current passphrase is incorrect',
      };
    }

    // Validate new passphrase
    const validation = validatePassphrase(newPassphrase);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Invalid new passphrase: ' + validation.errors.join(', '),
      };
    }

    // Generate new hash
    const newPassphraseData = encoder.encode(newPassphrase);
    const newHashBuffer = await crypto.subtle.digest('SHA-256', newPassphraseData);
    const newHashArray = Array.from(new Uint8Array(newHashBuffer));
    const newHash = newHashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Update passphrase hash
    await chrome.storage.local.set({
      [ENCRYPTION_KEYS.PASSPHRASE_HASH]: newHash,
    });

    return {
      success: true,
      message: 'Passphrase changed successfully',
    };
  } catch (error) {
    console.error('Failed to change passphrase:', error);
    return {
      success: false,
      message: 'Failed to change passphrase: ' + error.message,
    };
  }
}

/**
 * Verify passphrase
 * @param {string} passphrase - Passphrase to verify
 * @returns {Promise<boolean>} True if correct
 */
export async function verifyPassphrase(passphrase) {
  try {
    const result = await chrome.storage.local.get([ENCRYPTION_KEYS.PASSPHRASE_HASH]);

    if (!result[ENCRYPTION_KEYS.PASSPHRASE_HASH]) {
      return false;
    }

    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passphraseData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hash === result[ENCRYPTION_KEYS.PASSPHRASE_HASH];
  } catch (error) {
    console.error('Failed to verify passphrase:', error);
    return false;
  }
}

/**
 * Encrypt data if encryption is enabled
 * @param {any} data - Data to encrypt
 * @param {string} passphrase - Passphrase
 * @returns {Promise<Object>} Encrypted data or original data
 */
export async function encryptIfEnabled(data, passphrase) {
  try {
    const status = await getEncryptionStatus();

    if (status.status !== ENCRYPTION_STATUS.ENABLED) {
      return {
        encrypted: false,
        data: data,
      };
    }

    const encrypted = await encryptData(data, passphrase);
    return {
      encrypted: true,
      data: encrypted,
    };
  } catch (error) {
    console.error('Failed to encrypt data:', error);
    return {
      encrypted: false,
      data: data,
      error: error.message,
    };
  }
}

/**
 * Decrypt data if it's encrypted
 * @param {any} data - Data to decrypt
 * @param {string} passphrase - Passphrase
 * @returns {Promise<Object>} Decrypted data or original data
 */
export async function decryptIfEncrypted(data, passphrase) {
  try {
    // Check if data is encrypted
    if (!data || typeof data !== 'object' || !data.data || !data.iv || !data.salt) {
      return {
        decrypted: false,
        data: data,
      };
    }

    const decrypted = await decryptData(data, passphrase);
    return {
      decrypted: true,
      data: decrypted,
    };
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    return {
      decrypted: false,
      data: data,
      error: error.message,
    };
  }
}

/**
 * Get encryption strength indicator
 * @param {string} passphrase - Passphrase to analyze
 * @returns {Object} Strength information
 */
export function getPassphraseStrength(passphrase) {
  if (!passphrase) {
    return {
      score: 0,
      level: 'none',
      message: 'No passphrase entered',
    };
  }

  let score = 0;
  const feedback = [];

  // Length
  if (passphrase.length >= 8) score += 1;
  if (passphrase.length >= 12) score += 1;
  if (passphrase.length >= 16) score += 1;

  // Character variety
  if (/[a-z]/.test(passphrase)) score += 1;
  if (/[A-Z]/.test(passphrase)) score += 1;
  if (/[0-9]/.test(passphrase)) score += 1;
  if (/[^a-zA-Z0-9]/.test(passphrase)) score += 1;

  // Determine level
  let level, message;
  if (score <= 2) {
    level = 'weak';
    message = 'Very weak passphrase';
  } else if (score <= 4) {
    level = 'fair';
    message = 'Fair passphrase strength';
  } else if (score <= 6) {
    level = 'good';
    message = 'Good passphrase strength';
  } else {
    level = 'strong';
    message = 'Strong passphrase';
  }

  return {
    score,
    level,
    message,
    maxScore: 7,
  };
}
