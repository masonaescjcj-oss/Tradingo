import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage that never throws: when the browser blocks storage (private mode,
 * sandboxed frames) the app still starts, it just doesn't remember progress.
 */
export const safeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Progress just isn't saved.
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Nothing to remove.
    }
  },
};
