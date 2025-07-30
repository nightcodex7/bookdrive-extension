/**
 * advanced-encryption.js - Additional Encryption Options
 *
 * This module provides additional encryption algorithms and options
 * beyond the basic AES-GCM implementation.
 */

/**
 * Supported encryption algorithms
 */
export const ENCRYPTION_ALGORITHMS = {
  AES_GCM: 'AES-GCM',
  AES_CBC: 'AES-CBC',
  AES_CTR: 'AES-CTR',
  CHACHA20_POLY1305: 'ChaCha20-Poly1305',
  RSA_OAEP: 'RSA-OAEP',
  ECDH: 'ECDH',
};

/**
 * Key derivation functions
 */
export const KEY_DERIVATION_FUNCTIONS = {
  PBKDF2: 'PBKDF2',
  ARGON2: 'Argon2',
  SCRYPT: 'Scrypt',
  HKDF: 'HKDF',
};

/**
 * Hash algorithms
 */
export const HASH_ALGORITHMS = {
  SHA_256: 'SHA-256',
  SHA_384: 'SHA-384',
  SHA_512: 'SHA-512',
  BLAKE2B: 'Blake2b',
};

/**
 * Encryption configuration
 */
export const ENCRYPTION_CONFIG = {
  [ENCRYPTION_ALGORITHMS.AES_GCM]: {
    keyLength: 256,
    ivLength: 12,
    tagLength: 16,
    iterations: 100000,
  },
  [ENCRYPTION_ALGORITHMS.AES_CBC]: {
    keyLength: 256,
    ivLength: 16,
    iterations: 100000,
  },
  [ENCRYPTION_ALGORITHMS.AES_CTR]: {
    keyLength: 256,
    ivLength: 16,
    iterations: 100000,
  },
  [ENCRYPTION_ALGORITHMS.CHACHA20_POLY1305]: {
    keyLength: 256,
    ivLength: 12,
    tagLength: 16,
    iterations: 100000,
  },
  [ENCRYPTION_ALGORITHMS.RSA_OAEP]: {
    keyLength: 2048,
    iterations: 100000,
  },
  [ENCRYPTION_ALGORITHMS.ECDH]: {
    curve: 'P-256',
    iterations: 100000,
  },
};

/**
 * Advanced encryption manager
 */
export class AdvancedEncryptionManager {
  constructor(options = {}) {
    this.algorithm = options.algorithm || ENCRYPTION_ALGORITHMS.AES_GCM;
    this.keyDerivation = options.keyDerivation || KEY_DERIVATION_FUNCTIONS.PBKDF2;
    this.hashAlgorithm = options.hashAlgorithm || HASH_ALGORITHMS.SHA_256;
    this.iterations = options.iterations || ENCRYPTION_CONFIG[this.algorithm].iterations;
    this.saltLength = options.saltLength || 32;
  }

  /**
   * Encrypt data with advanced options
   * @param {any} data - Data to encrypt
   * @param {string} passphrase - Encryption passphrase
   * @param {Object} options - Encryption options
   * @returns {Promise<Object>} Encrypted data
   */
  async encrypt(data, passphrase, options = {}) {
    try {
      const config = { ...ENCRYPTION_CONFIG[this.algorithm], ...options };

      // Generate salt
      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));

      // Derive key
      const key = await this.deriveKey(passphrase, salt, config);

      // Generate IV/nonce
      const iv = crypto.getRandomValues(new Uint8Array(config.ivLength));

      // Encrypt data
      const encryptedData = await this.performEncryption(data, key, iv, config);

      return {
        algorithm: this.algorithm,
        keyDerivation: this.keyDerivation,
        hashAlgorithm: this.hashAlgorithm,
        iterations: this.iterations,
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        data: encryptedData,
        metadata: {
          encryptedAt: new Date().toISOString(),
          version: '2.0',
        },
      };
    } catch (error) {
      console.error('Advanced encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data with advanced options
   * @param {Object} encryptedData - Encrypted data
   * @param {string} passphrase - Decryption passphrase
   * @returns {Promise<any>} Decrypted data
   */
  async decrypt(encryptedData, passphrase) {
    try {
      const { algorithm, keyDerivation, hashAlgorithm, iterations, salt, iv, data } = encryptedData;

      // Update algorithm if different
      if (algorithm && algorithm !== this.algorithm) {
        this.algorithm = algorithm;
      }

      // Update key derivation if different
      if (keyDerivation && keyDerivation !== this.keyDerivation) {
        this.keyDerivation = keyDerivation;
      }

      // Update hash algorithm if different
      if (hashAlgorithm && hashAlgorithm !== this.hashAlgorithm) {
        this.hashAlgorithm = hashAlgorithm;
      }

      // Update iterations if different
      if (iterations && iterations !== this.iterations) {
        this.iterations = iterations;
      }

      const config = ENCRYPTION_CONFIG[this.algorithm];

      // Decode salt and IV
      const saltBytes = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));
      const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

      // Derive key
      const key = await this.deriveKey(passphrase, saltBytes, config);

      // Decrypt data
      const decryptedData = await this.performDecryption(data, key, ivBytes, config);

      return decryptedData;
    } catch (error) {
      console.error('Advanced decryption failed:', error);
      throw error;
    }
  }

  /**
   * Derive encryption key
   * @param {string} passphrase - Passphrase
   * @param {Uint8Array} salt - Salt
   * @param {Object} config - Configuration
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKey(passphrase, salt, config) {
    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);

    switch (this.keyDerivation) {
      case KEY_DERIVATION_FUNCTIONS.PBKDF2:
        return await this.deriveKeyPBKDF2(passphraseData, salt, config);
      case KEY_DERIVATION_FUNCTIONS.HKDF:
        return await this.deriveKeyHKDF(passphraseData, salt, config);
      case KEY_DERIVATION_FUNCTIONS.ARGON2:
        return await this.deriveKeyArgon2(passphraseData, salt, config);
      case KEY_DERIVATION_FUNCTIONS.SCRYPT:
        return await this.deriveKeyScrypt(passphraseData, salt, config);
      default:
        return await this.deriveKeyPBKDF2(passphraseData, salt, config);
    }
  }

  /**
   * Derive key using PBKDF2
   * @param {Uint8Array} passphraseData - Passphrase data
   * @param {Uint8Array} salt - Salt
   * @param {Object} config - Configuration
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKeyPBKDF2(passphraseData, salt, config) {
    const keyMaterial = await crypto.subtle.importKey('raw', passphraseData, 'PBKDF2', false, [
      'deriveKey',
    ]);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.iterations,
        hash: this.hashAlgorithm,
      },
      keyMaterial,
      { name: this.algorithm, length: config.keyLength },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Derive key using HKDF
   * @param {Uint8Array} passphraseData - Passphrase data
   * @param {Uint8Array} salt - Salt
   * @param {Object} config - Configuration
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKeyHKDF(passphraseData, salt, config) {
    const keyMaterial = await crypto.subtle.importKey('raw', passphraseData, 'HKDF', false, [
      'deriveKey',
    ]);

    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt,
        info: new TextEncoder().encode('BookDrive Encryption'),
        hash: this.hashAlgorithm,
      },
      keyMaterial,
      { name: this.algorithm, length: config.keyLength },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Derive key using Argon2 (simulated with PBKDF2)
   * @param {Uint8Array} passphraseData - Passphrase data
   * @param {Uint8Array} salt - Salt
   * @param {Object} config - Configuration
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKeyArgon2(passphraseData, salt, config) {
    // Note: Web Crypto API doesn't support Argon2 directly
    // This is a simulation using PBKDF2 with higher iterations
    const keyMaterial = await crypto.subtle.importKey('raw', passphraseData, 'PBKDF2', false, [
      'deriveKey',
    ]);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.iterations * 10, // Higher iterations for Argon2 simulation
        hash: this.hashAlgorithm,
      },
      keyMaterial,
      { name: this.algorithm, length: config.keyLength },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Derive key using Scrypt (simulated with PBKDF2)
   * @param {Uint8Array} passphraseData - Passphrase data
   * @param {Uint8Array} salt - Salt
   * @param {Object} config - Configuration
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKeyScrypt(passphraseData, salt, config) {
    // Note: Web Crypto API doesn't support Scrypt directly
    // This is a simulation using PBKDF2 with higher iterations
    const keyMaterial = await crypto.subtle.importKey('raw', passphraseData, 'PBKDF2', false, [
      'deriveKey',
    ]);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.iterations * 5, // Higher iterations for Scrypt simulation
        hash: this.hashAlgorithm,
      },
      keyMaterial,
      { name: this.algorithm, length: config.keyLength },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Perform encryption based on algorithm
   * @param {any} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {Uint8Array} iv - Initialization vector
   * @param {Object} config - Configuration
   * @returns {Promise<string>} Encrypted data
   */
  async performEncryption(data, key, iv, config) {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataBytes = encoder.encode(dataString);

    switch (this.algorithm) {
      case ENCRYPTION_ALGORITHMS.AES_GCM:
        return await this.encryptAESGCM(dataBytes, key, iv);
      case ENCRYPTION_ALGORITHMS.AES_CBC:
        return await this.encryptAESCBC(dataBytes, key, iv);
      case ENCRYPTION_ALGORITHMS.AES_CTR:
        return await this.encryptAESCTR(dataBytes, key, iv);
      case ENCRYPTION_ALGORITHMS.CHACHA20_POLY1305:
        return await this.encryptChaCha20Poly1305(dataBytes, key, iv);
      case ENCRYPTION_ALGORITHMS.RSA_OAEP:
        return await this.encryptRSAOAEP(dataBytes, key);
      case ENCRYPTION_ALGORITHMS.ECDH:
        return await this.encryptECDH(dataBytes, key, iv);
      default:
        throw new Error(`Unsupported encryption algorithm: ${this.algorithm}`);
    }
  }

  /**
   * Perform decryption based on algorithm
   * @param {string} encryptedData - Encrypted data
   * @param {CryptoKey} key - Decryption key
   * @param {Uint8Array} iv - Initialization vector
   * @param {Object} config - Configuration
   * @returns {Promise<any>} Decrypted data
   */
  async performDecryption(encryptedData, key, iv, config) {
    const decoder = new TextDecoder();

    switch (this.algorithm) {
      case ENCRYPTION_ALGORITHMS.AES_GCM:
        const decryptedBytes = await this.decryptAESGCM(encryptedData, key, iv);
        return JSON.parse(decoder.decode(decryptedBytes));
      case ENCRYPTION_ALGORITHMS.AES_CBC:
        const decryptedBytesCBC = await this.decryptAESCBC(encryptedData, key, iv);
        return JSON.parse(decoder.decode(decryptedBytesCBC));
      case ENCRYPTION_ALGORITHMS.AES_CTR:
        const decryptedBytesCTR = await this.decryptAESCTR(encryptedData, key, iv);
        return JSON.parse(decoder.decode(decryptedBytesCTR));
      case ENCRYPTION_ALGORITHMS.CHACHA20_POLY1305:
        const decryptedBytesChaCha = await this.decryptChaCha20Poly1305(encryptedData, key, iv);
        return JSON.parse(decoder.decode(decryptedBytesChaCha));
      case ENCRYPTION_ALGORITHMS.RSA_OAEP:
        const decryptedBytesRSA = await this.decryptRSAOAEP(encryptedData, key);
        return JSON.parse(decoder.decode(decryptedBytesRSA));
      case ENCRYPTION_ALGORITHMS.ECDH:
        const decryptedBytesECDH = await this.decryptECDH(encryptedData, key, iv);
        return JSON.parse(decoder.decode(decryptedBytesECDH));
      default:
        throw new Error(`Unsupported encryption algorithm: ${this.algorithm}`);
    }
  }

  /**
   * Encrypt using AES-GCM
   * @param {Uint8Array} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<string>} Encrypted data
   */
  async encryptAESGCM(data, key, iv) {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  /**
   * Decrypt using AES-GCM
   * @param {string} encryptedData - Encrypted data
   * @param {CryptoKey} key - Decryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<Uint8Array>} Decrypted data
   */
  async decryptAESGCM(encryptedData, key, iv) {
    const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBytes);
  }

  /**
   * Encrypt using AES-CBC
   * @param {Uint8Array} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<string>} Encrypted data
   */
  async encryptAESCBC(data, key, iv) {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  /**
   * Decrypt using AES-CBC
   * @param {string} encryptedData - Encrypted data
   * @param {CryptoKey} key - Decryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<Uint8Array>} Decrypted data
   */
  async decryptAESCBC(encryptedData, key, iv) {
    const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    return await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, encryptedBytes);
  }

  /**
   * Encrypt using AES-CTR
   * @param {Uint8Array} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<string>} Encrypted data
   */
  async encryptAESCTR(data, key, iv) {
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CTR', counter: iv, length: 128 },
      key,
      data,
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  /**
   * Decrypt using AES-CTR
   * @param {string} encryptedData - Encrypted data
   * @param {CryptoKey} key - Decryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<Uint8Array>} Decrypted data
   */
  async decryptAESCTR(encryptedData, key, iv) {
    const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    return await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter: iv, length: 128 },
      key,
      encryptedBytes,
    );
  }

  /**
   * Encrypt using ChaCha20-Poly1305
   * @param {Uint8Array} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<string>} Encrypted data
   */
  async encryptChaCha20Poly1305(data, key, iv) {
    // Note: Web Crypto API doesn't support ChaCha20-Poly1305 directly
    // This is a fallback to AES-GCM
    console.warn('ChaCha20-Poly1305 not supported, falling back to AES-GCM');
    return await this.encryptAESGCM(data, key, iv);
  }

  /**
   * Decrypt using ChaCha20-Poly1305
   * @param {string} encryptedData - Encrypted data
   * @param {CryptoKey} key - Decryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<Uint8Array>} Decrypted data
   */
  async decryptChaCha20Poly1305(encryptedData, key, iv) {
    // Note: Web Crypto API doesn't support ChaCha20-Poly1305 directly
    // This is a fallback to AES-GCM
    console.warn('ChaCha20-Poly1305 not supported, falling back to AES-GCM');
    return await this.decryptAESGCM(encryptedData, key, iv);
  }

  /**
   * Encrypt using RSA-OAEP
   * @param {Uint8Array} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @returns {Promise<string>} Encrypted data
   */
  async encryptRSAOAEP(data, key) {
    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  /**
   * Decrypt using RSA-OAEP
   * @param {string} encryptedData - Encrypted data
   * @param {CryptoKey} key - Decryption key
   * @returns {Promise<Uint8Array>} Decrypted data
   */
  async decryptRSAOAEP(encryptedData, key) {
    const encryptedBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    return await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, encryptedBytes);
  }

  /**
   * Encrypt using ECDH
   * @param {Uint8Array} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<string>} Encrypted data
   */
  async encryptECDH(data, key, iv) {
    // Note: ECDH is typically used for key exchange, not direct encryption
    // This is a simplified implementation
    console.warn('ECDH encryption is simplified, consider using hybrid encryption');
    return await this.encryptAESGCM(data, key, iv);
  }

  /**
   * Decrypt using ECDH
   * @param {string} encryptedData - Encrypted data
   * @param {CryptoKey} key - Decryption key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<Uint8Array>} Decrypted data
   */
  async decryptECDH(encryptedData, key, iv) {
    // Note: ECDH is typically used for key exchange, not direct encryption
    // This is a simplified implementation
    console.warn('ECDH decryption is simplified, consider using hybrid encryption');
    return await this.decryptAESGCM(encryptedData, key, iv);
  }
}

/**
 * Generate encryption key pair
 * @param {string} algorithm - Key pair algorithm
 * @param {Object} options - Key generation options
 * @returns {Promise<Object>} Key pair
 */
export async function generateKeyPair(algorithm = ENCRYPTION_ALGORITHMS.RSA_OAEP, options = {}) {
  try {
    let keyPair;

    switch (algorithm) {
      case ENCRYPTION_ALGORITHMS.RSA_OAEP:
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: options.modulusLength || 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: options.hash || HASH_ALGORITHMS.SHA_256,
          },
          true,
          ['encrypt', 'decrypt'],
        );
        break;

      case ENCRYPTION_ALGORITHMS.ECDH:
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'ECDH',
            namedCurve: options.curve || 'P-256',
          },
          true,
          ['deriveKey', 'deriveBits'],
        );
        break;

      default:
        throw new Error(`Unsupported key pair algorithm: ${algorithm}`);
    }

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      algorithm,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to generate key pair:', error);
    throw error;
  }
}

/**
 * Export key to format
 * @param {CryptoKey} key - Key to export
 * @param {string} format - Export format
 * @returns {Promise<string>} Exported key
 */
export async function exportKey(key, format = 'jwk') {
  try {
    const exported = await crypto.subtle.exportKey(format, key);

    if (format === 'jwk') {
      return JSON.stringify(exported);
    } else if (format === 'raw') {
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } else if (format === 'pkcs8') {
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } else if (format === 'spki') {
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    }

    throw new Error(`Unsupported export format: ${format}`);
  } catch (error) {
    console.error('Failed to export key:', error);
    throw error;
  }
}

/**
 * Import key from format
 * @param {string} keyData - Key data
 * @param {string} format - Import format
 * @param {string} algorithm - Key algorithm
 * @param {Array} usages - Key usages
 * @returns {Promise<CryptoKey>} Imported key
 */
export async function importKey(keyData, format, algorithm, usages) {
  try {
    let keyMaterial;

    if (format === 'jwk') {
      keyMaterial = JSON.parse(keyData);
    } else if (format === 'raw') {
      keyMaterial = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    } else if (format === 'pkcs8') {
      keyMaterial = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    } else if (format === 'spki') {
      keyMaterial = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    } else {
      throw new Error(`Unsupported import format: ${format}`);
    }

    return await crypto.subtle.importKey(format, keyMaterial, algorithm, false, usages);
  } catch (error) {
    console.error('Failed to import key:', error);
    throw error;
  }
}

/**
 * Validate encryption configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateEncryptionConfig(config) {
  const errors = [];
  const warnings = [];

  // Check algorithm
  if (!Object.values(ENCRYPTION_ALGORITHMS).includes(config.algorithm)) {
    errors.push(`Unsupported encryption algorithm: ${config.algorithm}`);
  }

  // Check key derivation
  if (!Object.values(KEY_DERIVATION_FUNCTIONS).includes(config.keyDerivation)) {
    errors.push(`Unsupported key derivation function: ${config.keyDerivation}`);
  }

  // Check hash algorithm
  if (!Object.values(HASH_ALGORITHMS).includes(config.hashAlgorithm)) {
    errors.push(`Unsupported hash algorithm: ${config.hashAlgorithm}`);
  }

  // Check iterations
  if (config.iterations < 10000) {
    warnings.push('Low iteration count may reduce security');
  }

  // Check salt length
  if (config.saltLength < 16) {
    warnings.push('Short salt length may reduce security');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get recommended encryption configuration
 * @param {string} securityLevel - Security level (low, medium, high, maximum)
 * @returns {Object} Recommended configuration
 */
export function getRecommendedConfig(securityLevel = 'high') {
  const configs = {
    low: {
      algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
      keyDerivation: KEY_DERIVATION_FUNCTIONS.PBKDF2,
      hashAlgorithm: HASH_ALGORITHMS.SHA_256,
      iterations: 50000,
      saltLength: 16,
    },
    medium: {
      algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
      keyDerivation: KEY_DERIVATION_FUNCTIONS.PBKDF2,
      hashAlgorithm: HASH_ALGORITHMS.SHA_256,
      iterations: 100000,
      saltLength: 32,
    },
    high: {
      algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
      keyDerivation: KEY_DERIVATION_FUNCTIONS.HKDF,
      hashAlgorithm: HASH_ALGORITHMS.SHA_384,
      iterations: 200000,
      saltLength: 32,
    },
    maximum: {
      algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
      keyDerivation: KEY_DERIVATION_FUNCTIONS.ARGON2,
      hashAlgorithm: HASH_ALGORITHMS.SHA_512,
      iterations: 500000,
      saltLength: 64,
    },
  };

  return configs[securityLevel] || configs.high;
}
