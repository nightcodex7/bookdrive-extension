declare module 'crypto-js' {
  namespace CryptoJS {
    interface WordArray {
      words: number[];
      sigBytes: number;
      toString(encoder?: Encoder): string;
      concat(wordArray: WordArray): WordArray;
      clamp(): void;
      clone(): WordArray;
    }

    interface Encoder {
      stringify(wordArray: WordArray): string;
      parse(str: string): WordArray;
    }

    interface Hasher {
      reset(): Hasher;
      update(messageUpdate: WordArray | string): Hasher;
      finalize(messageUpdate?: WordArray | string): WordArray;
    }

    interface Cipher {
      encrypt(message: WordArray | string, key: WordArray | string, cfg?: object): CipherParams;
      decrypt(ciphertext: CipherParams, key: WordArray | string, cfg?: object): WordArray;
    }

    interface CipherParams {
      ciphertext: WordArray;
      key: WordArray;
      iv: WordArray;
      salt: WordArray;
      algorithm: object;
      mode: object;
      padding: object;
      blockSize: number;
      formatter: object;
      toString(formatter?: object): string;
    }
  }

  export const AES: CryptoJS.Cipher;
  export const enc: {
    Hex: CryptoJS.Encoder;
    Latin1: CryptoJS.Encoder;
    Utf8: CryptoJS.Encoder;
    Utf16: CryptoJS.Encoder;
    Base64: CryptoJS.Encoder;
  };
  export function SHA256(message: string | CryptoJS.WordArray): CryptoJS.WordArray;
  export function lib(): void;
}
