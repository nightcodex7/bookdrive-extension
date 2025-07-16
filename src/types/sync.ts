// Shared types for BookDrive sync events and encrypted data

export interface SyncEvent {
  time: string;
  mode: string;
  status: string;
  error?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface EncryptedData {
  iv: string;
  data: string;
  salt?: string;
}
