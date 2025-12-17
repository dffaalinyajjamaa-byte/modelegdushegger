// Safe localStorage wrapper for Windows 10 compatibility
class SafeLocalStorage {
  private memoryStorage: Map<string, string> = new Map();
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
  }

  private checkLocalStorage(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available, using memory storage');
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isLocalStorageAvailable) {
      try {
        return localStorage.getItem(key);
      } catch {
        return this.memoryStorage.get(key) || null;
      }
    }
    return this.memoryStorage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem(key, value);
      } catch {
        this.memoryStorage.set(key, value);
      }
    } else {
      this.memoryStorage.set(key, value);
    }
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem(key);
      } catch {
        this.memoryStorage.delete(key);
      }
    } else {
      this.memoryStorage.delete(key);
    }
  }
}

export const safeStorage = new SafeLocalStorage();
