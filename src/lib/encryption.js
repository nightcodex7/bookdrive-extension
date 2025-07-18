// encryption.js - Client-side encryption utilities for BookDrive

/**
 * Generate a cryptographic key from a passphrase using PBKDF2
 * @param {string} passphrase
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt data using AES-GCM with a passphrase
 * @param {any} data
 * @param {string} passphrase
 * @returns {Promise<Object>}
 */
export async function encryptData(data, passphrase) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);
  const encodedData = encoder.encode(JSON.stringify(data));

  const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedData);

  return {
    data: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

/**
 * Decrypt data using AES-GCM with a passphrase
 * @param {Object} encryptedData
 * @param {string} passphrase
 * @returns {Promise<any>}
 */
export async function decryptData(encryptedData, passphrase) {
  const decoder = new TextDecoder();

  const salt = Uint8Array.from(atob(encryptedData.salt || ''), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encryptedData.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encryptedData.data), (c) => c.charCodeAt(0));

  const key = await deriveKey(passphrase, salt);

  const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

  return JSON.parse(decoder.decode(decryptedData));
}

/**
 * Validate encryption passphrase strength
 * @param {string} passphrase
 * @returns {Object}
 */
export function validatePassphrase(passphrase) {
  const errors = [];

  if (passphrase.length < 8) {
    errors.push('Passphrase must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(passphrase)) {
    errors.push('Passphrase must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(passphrase)) {
    errors.push('Passphrase must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(passphrase)) {
    errors.push('Passphrase must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
