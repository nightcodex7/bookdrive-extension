# Advanced Encryption

BookDrive's Advanced Encryption system provides multiple encryption algorithms, key derivation functions, and advanced security features. This system goes beyond basic encryption to offer comprehensive data protection with configurable security levels and hybrid encryption capabilities.

## Overview

The Advanced Encryption system implements 6 different encryption algorithms, multiple key derivation functions, and advanced key management capabilities. It provides flexible encryption options for different security requirements and supports both symmetric and asymmetric encryption.

## Encryption Algorithms

### Symmetric Encryption Algorithms

#### 1. AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)
- **Description**: Authenticated encryption with associated data
- **Key Size**: 128, 192, or 256 bits
- **Security Level**: High
- **Performance**: Excellent
- **Use Case**: General purpose encryption, recommended default

#### 2. AES-CBC (Advanced Encryption Standard - Cipher Block Chaining)
- **Description**: Block cipher with chaining
- **Key Size**: 128, 192, or 256 bits
- **Security Level**: High
- **Performance**: Good
- **Use Case**: Legacy compatibility, specific requirements

#### 3. AES-CTR (Advanced Encryption Standard - Counter Mode)
- **Description**: Stream cipher mode
- **Key Size**: 128, 192, or 256 bits
- **Security Level**: High
- **Performance**: Excellent
- **Use Case**: High-performance encryption, parallel processing

#### 4. ChaCha20-Poly1305
- **Description**: Stream cipher with authentication
- **Key Size**: 256 bits
- **Security Level**: High
- **Performance**: Excellent
- **Use Case**: Modern encryption, mobile devices

### Asymmetric Encryption Algorithms

#### 5. RSA-OAEP (Rivest-Shamir-Adleman - Optimal Asymmetric Encryption Padding)
- **Description**: Asymmetric encryption with padding
- **Key Size**: 2048, 3072, or 4096 bits
- **Security Level**: High
- **Performance**: Moderate
- **Use Case**: Key exchange, digital signatures

#### 6. ECDH (Elliptic Curve Diffie-Hellman)
- **Description**: Elliptic curve key exchange
- **Key Size**: 256, 384, or 521 bits
- **Security Level**: High
- **Performance**: Good
- **Use Case**: Key exchange, forward secrecy

## Key Derivation Functions

### 1. PBKDF2 (Password-Based Key Derivation Function 2)
- **Description**: Password-based key derivation
- **Iterations**: Configurable (recommended: 100,000+)
- **Security Level**: High
- **Performance**: Moderate
- **Use Case**: Password-based encryption

### 2. HKDF (HMAC-based Key Derivation Function)
- **Description**: HMAC-based key derivation
- **Iterations**: Single pass
- **Security Level**: High
- **Performance**: Excellent
- **Use Case**: Key derivation from master keys

### 3. Argon2
- **Description**: Memory-hard key derivation function
- **Iterations**: Configurable
- **Security Level**: Very High
- **Performance**: Memory-intensive
- **Use Case**: High-security password hashing

### 4. Scrypt
- **Description**: Memory-hard key derivation function
- **Iterations**: Configurable
- **Security Level**: Very High
- **Performance**: Memory-intensive
- **Use Case**: High-security key derivation

## Hash Algorithms

### 1. SHA-256
- **Description**: 256-bit hash function
- **Security Level**: High
- **Performance**: Excellent
- **Use Case**: General purpose hashing

### 2. SHA-384
- **Description**: 384-bit hash function
- **Security Level**: High
- **Performance**: Good
- **Use Case**: High-security hashing

### 3. SHA-512
- **Description**: 512-bit hash function
- **Security Level**: High
- **Performance**: Good
- **Use Case**: High-security hashing

### 4. Blake2b
- **Description**: 512-bit hash function
- **Security Level**: High
- **Performance**: Excellent
- **Use Case**: High-performance hashing

## Using the Advanced Encryption Manager

### Basic Usage
```javascript
import { AdvancedEncryptionManager } from '../lib/encryption/advanced-encryption.js';

// Create encryption manager with default settings
const encryptionManager = new AdvancedEncryptionManager();

// Encrypt data
const encryptedData = await encryptionManager.encrypt(
  'Hello, World!',
  'my-secure-passphrase'
);

// Decrypt data
const decryptedData = await encryptionManager.decrypt(
  encryptedData,
  'my-secure-passphrase'
);
```

### Custom Configuration
```javascript
// Create encryption manager with custom configuration
const encryptionManager = new AdvancedEncryptionManager({
  algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
  keyDerivation: KEY_DERIVATION_FUNCTIONS.PBKDF2,
  iterations: 200000,
  saltLength: 32,
  keyLength: 256
});
```

### Different Algorithms
```javascript
// Use AES-CBC encryption
const aesCbcManager = new AdvancedEncryptionManager({
  algorithm: ENCRYPTION_ALGORITHMS.AES_CBC
});

// Use RSA-OAEP encryption
const rsaManager = new AdvancedEncryptionManager({
  algorithm: ENCRYPTION_ALGORITHMS.RSA_OAEP
});

// Use ChaCha20-Poly1305 encryption
const chachaManager = new AdvancedEncryptionManager({
  algorithm: ENCRYPTION_ALGORITHMS.CHACHA20_POLY1305
});
```

## Key Management

### Generating Key Pairs
```javascript
import { generateKeyPair } from '../lib/encryption/advanced-encryption.js';

// Generate RSA key pair
const rsaKeyPair = await generateKeyPair(ENCRYPTION_ALGORITHMS.RSA_OAEP, {
  modulusLength: 2048,
  publicExponent: 65537
});

// Generate ECDH key pair
const ecdhKeyPair = await generateKeyPair(ENCRYPTION_ALGORITHMS.ECDH, {
  namedCurve: 'P-256'
});
```

### Exporting and Importing Keys
```javascript
import { exportKey, importKey } from '../lib/encryption/advanced-encryption.js';

// Export public key
const exportedPublicKey = await exportKey(rsaKeyPair.publicKey, 'spki');

// Export private key
const exportedPrivateKey = await exportKey(rsaKeyPair.privateKey, 'pkcs8');

// Import public key
const importedPublicKey = await importKey(
  exportedPublicKey,
  'spki',
  ENCRYPTION_ALGORITHMS.RSA_OAEP,
  ['encrypt']
);

// Import private key
const importedPrivateKey = await importKey(
  exportedPrivateKey,
  'pkcs8',
  ENCRYPTION_ALGORITHMS.RSA_OAEP,
  ['decrypt']
);
```

## Configuration Validation

### Validating Encryption Configuration
```javascript
import { validateEncryptionConfig } from '../lib/encryption/advanced-encryption.js';

// Validate configuration
const config = {
  algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
  keyDerivation: KEY_DERIVATION_FUNCTIONS.PBKDF2,
  iterations: 100000,
  saltLength: 32,
  keyLength: 256
};

const validation = validateEncryptionConfig(config);
if (validation.isValid) {
  console.log('Configuration is valid');
} else {
  console.log('Configuration errors:', validation.errors);
}
```

### Getting Recommended Configurations
```javascript
import { getRecommendedConfig } from '../lib/encryption/advanced-encryption.js';

// Get high-security configuration
const highSecurityConfig = getRecommendedConfig('high');

// Get balanced configuration
const balancedConfig = getRecommendedConfig('balanced');

// Get performance-focused configuration
const performanceConfig = getRecommendedConfig('performance');
```

## Security Levels

### High Security Configuration
```javascript
const highSecurityConfig = {
  algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
  keyDerivation: KEY_DERIVATION_FUNCTIONS.ARGON2,
  iterations: 1000000,
  saltLength: 32,
  keyLength: 256,
  hashAlgorithm: HASH_ALGORITHMS.SHA_512
};
```

### Balanced Configuration
```javascript
const balancedConfig = {
  algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
  keyDerivation: KEY_DERIVATION_FUNCTIONS.PBKDF2,
  iterations: 200000,
  saltLength: 32,
  keyLength: 256,
  hashAlgorithm: HASH_ALGORITHMS.SHA_256
};
```

### Performance Configuration
```javascript
const performanceConfig = {
  algorithm: ENCRYPTION_ALGORITHMS.CHACHA20_POLY1305,
  keyDerivation: KEY_DERIVATION_FUNCTIONS.HKDF,
  iterations: 1,
  saltLength: 32,
  keyLength: 256,
  hashAlgorithm: HASH_ALGORITHMS.BLAKE2B
};
```

## Hybrid Encryption

### Combining Symmetric and Asymmetric Encryption
```javascript
// Generate key pair for hybrid encryption
const keyPair = await generateKeyPair(ENCRYPTION_ALGORITHMS.RSA_OAEP);

// Encrypt data with hybrid approach
const hybridEncrypted = await encryptionManager.encrypt(data, passphrase, {
  hybrid: true,
  publicKey: keyPair.publicKey,
  symmetricAlgorithm: ENCRYPTION_ALGORITHMS.AES_GCM
});

// Decrypt hybrid encrypted data
const decrypted = await encryptionManager.decrypt(hybridEncrypted, passphrase, {
  hybrid: true,
  privateKey: keyPair.privateKey
});
```

## Performance Optimization

### Algorithm Selection
```javascript
// For high-performance applications
const fastManager = new AdvancedEncryptionManager({
  algorithm: ENCRYPTION_ALGORITHMS.CHACHA20_POLY1305,
  keyDerivation: KEY_DERIVATION_FUNCTIONS.HKDF
});

// For maximum security
const secureManager = new AdvancedEncryptionManager({
  algorithm: ENCRYPTION_ALGORITHMS.AES_GCM,
  keyDerivation: KEY_DERIVATION_FUNCTIONS.ARGON2,
  iterations: 1000000
});
```

### Caching and Optimization
```javascript
// Cache derived keys for performance
const cachedManager = new AdvancedEncryptionManager({
  cacheDerivedKeys: true,
  cacheSize: 100,
  cacheExpiration: 3600000 // 1 hour
});
```

## Error Handling

### Handling Encryption Errors
```javascript
try {
  const encrypted = await encryptionManager.encrypt(data, passphrase);
} catch (error) {
  if (error.name === 'EncryptionError') {
    console.error('Encryption failed:', error.message);
  } else if (error.name === 'KeyDerivationError') {
    console.error('Key derivation failed:', error.message);
  } else {
    console.error('Unknown encryption error:', error);
  }
}
```

### Validation and Recovery
```javascript
// Validate encrypted data before decryption
const isValid = await encryptionManager.validateEncryptedData(encryptedData);
if (isValid) {
  const decrypted = await encryptionManager.decrypt(encryptedData, passphrase);
} else {
  console.error('Invalid encrypted data');
}
```

## Best Practices

### 1. Algorithm Selection
- **Use AES-GCM** for general purpose encryption
- **Use ChaCha20-Poly1305** for high-performance applications
- **Use RSA-OAEP** for key exchange and digital signatures
- **Use ECDH** for forward secrecy

### 2. Key Management
- **Use strong passphrases** (minimum 12 characters)
- **Use unique salts** for each encryption operation
- **Use sufficient iterations** for key derivation (100,000+ for PBKDF2)
- **Store keys securely** and never in plain text

### 3. Configuration
- **Validate configurations** before use
- **Use recommended configurations** for security levels
- **Test configurations** in development environment
- **Document configuration choices** and reasons

### 4. Security
- **Regular key rotation** for long-term data
- **Monitor for vulnerabilities** in algorithms
- **Use secure random number generation**
- **Implement proper error handling**

## Troubleshooting

### Common Issues

1. **Encryption performance issues**
   - Use faster algorithms (ChaCha20-Poly1305)
   - Reduce key derivation iterations
   - Use HKDF instead of PBKDF2
   - Enable key caching

2. **Memory usage issues**
   - Use less memory-intensive algorithms
   - Reduce Argon2 memory cost
   - Use smaller key sizes where appropriate
   - Implement streaming encryption

3. **Compatibility issues**
   - Use widely supported algorithms (AES-GCM)
   - Check browser compatibility
   - Use fallback algorithms
   - Test across different platforms

4. **Security concerns**
   - Use recommended security levels
   - Increase key derivation iterations
   - Use longer key sizes
   - Implement proper key management

### Debugging
```javascript
// Enable debug logging
const debugManager = new AdvancedEncryptionManager({
  debug: true,
  logOperations: true,
  logPerformance: true
});

// Get encryption statistics
const stats = await encryptionManager.getStatistics();
console.log('Encryption statistics:', stats);
```

## API Reference

### Main Classes

#### `AdvancedEncryptionManager`
Main encryption manager class.

**Constructor Parameters**:
- `options`: Configuration options

**Methods**:
- `encrypt(data, passphrase, options)`: Encrypt data
- `decrypt(encryptedData, passphrase)`: Decrypt data
- `validateEncryptedData(encryptedData)`: Validate encrypted data
- `getStatistics()`: Get encryption statistics

### Utility Functions

#### `generateKeyPair(algorithm, options)`
Generates a key pair for asymmetric encryption.

**Parameters**:
- `algorithm`: Encryption algorithm
- `options`: Key generation options

**Returns**: Promise resolving to key pair

#### `exportKey(key, format)`
Exports a cryptographic key.

**Parameters**:
- `key`: Key to export
- `format`: Export format

**Returns**: Promise resolving to exported key

#### `importKey(keyData, format, algorithm, usages)`
Imports a cryptographic key.

**Parameters**:
- `keyData`: Key data to import
- `format`: Import format
- `algorithm`: Key algorithm
- `usages`: Key usages

**Returns**: Promise resolving to imported key

#### `validateEncryptionConfig(config)`
Validates encryption configuration.

**Parameters**:
- `config`: Configuration to validate

**Returns**: Validation result object

#### `getRecommendedConfig(securityLevel)`
Gets recommended configuration for security level.

**Parameters**:
- `securityLevel`: Security level (low, balanced, high)

**Returns**: Recommended configuration object

### Constants

#### `ENCRYPTION_ALGORITHMS`
Available encryption algorithms:
- `AES_GCM`
- `AES_CBC`
- `AES_CTR`
- `CHACHA20_POLY1305`
- `RSA_OAEP`
- `ECDH`

#### `KEY_DERIVATION_FUNCTIONS`
Available key derivation functions:
- `PBKDF2`
- `HKDF`
- `ARGON2`
- `SCRYPT`

#### `HASH_ALGORITHMS`
Available hash algorithms:
- `SHA_256`
- `SHA_384`
- `SHA_512`
- `BLAKE2B`

#### `ENCRYPTION_CONFIG`
Default encryption configuration:
- `DEFAULT_ALGORITHM`
- `DEFAULT_KEY_DERIVATION`
- `DEFAULT_ITERATIONS`
- `DEFAULT_SALT_LENGTH`
- `DEFAULT_KEY_LENGTH`

## Integration

The Advanced Encryption system integrates with:
- **Bookmark Storage**: Encrypting bookmark data
- **Backup System**: Encrypting backup files
- **Team Features**: Encrypting shared data
- **Public Collections**: Encrypting collection data
- **User Interface**: Encryption configuration and management 