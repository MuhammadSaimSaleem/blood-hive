import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let dbPromise = null;

const getDatabase = async () => {
  if (Platform.OS === 'web') return null;
  
  // If a connection attempt is already in progress or finished, return that promise
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('bloodhive.db');
  }
  return await dbPromise;
};

export const initDB = async () => {
  if (Platform.OS === 'web') return;

  try {
    const db = await getDatabase();
    if (!db) return;

    // Use a single transaction-like block for the PRAGMA and Table creation
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY NOT NULL,
        full_name TEXT,
        blood_type TEXT,
        phone TEXT,
        city TEXT,
        email TEXT,
        local_image_uri TEXT
      );
    `);
  } catch (error) {
    // If it fails, reset the promise so it can try again on next call
    dbPromise = null; 
    console.error("❌ Blood Hive DB Init Error:", error);
    throw error;
  }
};

export const getLocalProfile = async () => {
  const db = await getDatabase();
  if (!db) return null;
  try {
    return await db.getFirstAsync('SELECT * FROM user_profile LIMIT 1');
  } catch (e) {
    return e;
  }
};

export const saveLocalProfile = async (profile) => {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO user_profile (id, full_name, blood_type, phone, city, email, local_image_uri) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [profile.id, profile.full_name, profile.blood_type, profile.phone, profile.city, profile.email, profile.local_image_uri]
    );
  } catch (error) {
    console.error("Save Error:", error);
  }
};