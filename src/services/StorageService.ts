/**
 * StorageService - Abstraction layer for Chrome storage API.
 * Wraps chrome.storage.local with proper error handling.
 */
export class StorageService {
  static async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Storage read failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        resolve((result[key] as T) ?? null);
      });
    });
  }

  static async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Storage write failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        resolve();
      });
    });
  }

  static async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Storage remove failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        resolve();
      });
    });
  }
}
