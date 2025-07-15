// encryption.ts - Client-side encryption utilities for BookDrive

import type { EncryptedData } from '../types/sync';

/**
 * Generate a cryptographic key from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
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
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM with a passphrase
 */
export async function encryptData<T>(data: T, passphrase: string): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(passphrase, salt);
  const encodedData = encoder.encode(JSON.stringify(data));
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  return {
    data: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

/**
 * Decrypt data using AES-GCM with a passphrase
 */
export async function decryptData<T = unknown>(
  encryptedData: EncryptedData, 
  passphrase: string
): Promise<T> {
  const decoder = new TextDecoder();
  
  const salt = Uint8Array.from(atob(encryptedData.salt || ''), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encryptedData.data), c => c.charCodeAt(0));
  
  const key = await deriveKey(passphrase, salt);
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return JSON.parse(decoder.decode(decryptedData)) as T;
}

/**
 * Validate encryption passphrase strength
 */
export function validatePassphrase(passphrase: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
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