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
      CREATE TABLE IF NOT EXISTS chat_contacts (
        user_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        full_name TEXT,
        blood_type TEXT,
        phone_number TEXT,
        city TEXT,
        last_msg_content TEXT,
        last_msg_sender_id TEXT,
        last_msg_at TEXT,
        unread INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, room_id)
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY NOT NULL,
        room_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at);
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
// ─── Chat rooms cache ─────────────────────────────────────────────────────────

export const getCachedRooms = async (userId) => {
  const db = await getDatabase();
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM chat_contacts WHERE user_id = ? ORDER BY last_msg_at DESC`,
      [userId]
    );
    return rows.map((r) => ({
      roomId:       r.room_id,
      otherProfile: {
        id:           r.contact_id,
        full_name:    r.full_name,
        blood_type:   r.blood_type,
        phone_number: r.phone_number,
        city:         r.city,
      },
      lastMsg: r.last_msg_content ? {
        content:    r.last_msg_content,
        sender_id:  r.last_msg_sender_id,
        created_at: r.last_msg_at,
      } : null,
      unread: r.unread ?? 0,
    }));
  } catch (e) {
    console.error("getCachedRooms:", e);
    return [];
  }
};

export const upsertCachedRoom = async (userId, room) => {
  const db = await getDatabase();
  if (!db) return;
  const p = room.otherProfile;
  const m = room.lastMsg;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_contacts
        (user_id, contact_id, room_id, full_name, blood_type, phone_number, city,
         last_msg_content, last_msg_sender_id, last_msg_at, unread)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        userId,
        p?.id ?? "",
        room.roomId,
        p?.full_name ?? null,
        p?.blood_type ?? null,
        p?.phone_number ?? null,
        p?.city ?? null,
        m?.content ?? null,
        m?.sender_id ?? null,
        m?.created_at ?? null,
        room.unread ?? 0,
      ]
    );
  } catch (e) {
    console.error("upsertCachedRoom:", e);
  }
};

export const deleteCachedRoom = async (userId, roomId) => {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(
      `DELETE FROM chat_contacts WHERE user_id = ? AND room_id = ?`,
      [userId, roomId]
    );
    await db.runAsync(`DELETE FROM chat_messages WHERE room_id = ?`, [roomId]);
  } catch (e) {
    console.error("deleteCachedRoom:", e);
  }
};

// ─── Chat messages cache ──────────────────────────────────────────────────────

export const getCachedMessages = async (roomId) => {
  const db = await getDatabase();
  if (!db) return [];
  try {
    return await db.getAllAsync(
      `SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC`,
      [roomId]
    );
  } catch (e) {
    console.error("getCachedMessages:", e);
    return [];
  }
};

export const upsertCachedMessage = async (msg) => {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR IGNORE INTO chat_messages (id, room_id, sender_id, content, created_at)
       VALUES (?,?,?,?,?)`,
      [msg.id, msg.room_id, msg.sender_id, msg.content, msg.created_at]
    );
  } catch (e) {
    console.error("upsertCachedMessage:", e);
  }
};

export const upsertCachedMessages = async (msgs) => {
  const db = await getDatabase();
  if (!db) return;
  try {
    await db.withTransactionAsync(async () => {
      for (const msg of msgs) {
        await db.runAsync(
          `INSERT OR IGNORE INTO chat_messages (id, room_id, sender_id, content, created_at)
           VALUES (?,?,?,?,?)`,
          [msg.id, msg.room_id, msg.sender_id, msg.content, msg.created_at]
        );
      }
    });
  } catch (e) {
    console.error("upsertCachedMessages:", e);
  }
};