// ============================================================
// IslandPost — Data Layer (localStorage + optional Supabase sync)
// ============================================================

import { supabase } from './supabaseClient';
import type { Parcel, User, ActivityLog, ImportBatch, DeliveryRecord, AppSettings, AuthSession } from '../types';

const LS = {
  users: 'islandpost_users',
  parcels: 'islandpost_parcels',
  activity: 'islandpost_activity',
  settings: 'islandpost_settings',
  session: 'islandpost_session',
  batches: 'islandpost_batches',
  deliveries: 'islandpost_deliveries',
} as const;

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Simple ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Parcels ────────────────────────────────────────────────
export const parcelStorage = {
  async getAll(): Promise<Parcel[]> {
    const local = lsRead<Parcel[]>(LS.parcels, []);
    const { data, error } = await supabase.from('parcels').select('*');
    if (!error && data && data.length > 0) {
      lsWrite(LS.parcels, data as Parcel[]);
      return data as Parcel[];
    }
    return local;
  },

  async getById(id: string): Promise<Parcel | null> {
    const all = await this.getAll();
    return all.find((p) => p.id === id) ?? null;
  },

  async getByTracking(trackingNumber: string): Promise<Parcel | null> {
    const tn = trackingNumber.toLowerCase().trim();
    const all = await this.getAll();
    return all.find((p) => p.trackingNumber.toLowerCase() === tn) ?? null;
  },

  async create(data: Omit<Parcel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Parcel> {
    const now = new Date().toISOString();
    const parcel: Parcel = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const all = lsRead<Parcel[]>(LS.parcels, []);
    all.push(parcel);
    lsWrite(LS.parcels, all);
    await supabase.from('parcels').insert(parcel);
    return parcel;
  },

  async update(id: string, updates: Partial<Parcel>): Promise<Parcel | null> {
    const all = lsRead<Parcel[]>(LS.parcels, []);
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    lsWrite(LS.parcels, all);
    await supabase.from('parcels').update({ ...updates, updatedAt: all[idx].updatedAt }).eq('id', id);
    return all[idx];
  },

  async delete(id: string): Promise<boolean> {
    const all = lsRead<Parcel[]>(LS.parcels, []);
    const filtered = all.filter((p) => p.id !== id);
    if (filtered.length === all.length) return false;
    lsWrite(LS.parcels, filtered);
    await supabase.from('parcels').delete().eq('id', id);
    return true;
  },

  async bulkCreate(parcels: Omit<Parcel, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Parcel[]> {
    const now = new Date().toISOString();
    const created = parcels.map((p) => ({ ...p, id: generateId(), createdAt: now, updatedAt: now }));
    const all = lsRead<Parcel[]>(LS.parcels, []);
    all.push(...created);
    lsWrite(LS.parcels, all);
    await supabase.from('parcels').insert(created);
    return created;
  },

  async search(query: string, field: string = 'all'): Promise<Parcel[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    // Simple client‑side filter after fetching all parcels (can be optimized with RPC)
    const all = await this.getAll();
    return all.filter(p => {
      const includes = (val: string) => val?.toLowerCase().includes(q);
      if (field === 'trackingNumber') return includes(p.trackingNumber);
      if (field === 'customerName') return includes(p.customerName);
      if (field === 'mobileNumber') return p.mobileNumber.includes(q);
      if (field === 'island') return includes(p.island);
      if (field === 'address') return includes(p.address);
      return (
        includes(p.trackingNumber) ||
        includes(p.customerName) ||
        p.mobileNumber.includes(q) ||
        includes(p.island) ||
        includes(p.address) ||
        includes(p.courierName)
      );
    });
  },

  async exportToJSON(): Promise<string> {
    const all = await this.getAll();
    return JSON.stringify(all, null, 2);
  },
};

// ─── Users ──────────────────────────────────────────────────
export const userStorage = {
  async getAll(): Promise<User[]> {
    const local = lsRead<User[]>(LS.users, []);
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data && data.length > 0) {
      lsWrite(LS.users, data as User[]);
      return data as User[];
    }
    return local;
  },

  async getById(id: string): Promise<User | null> {
    const all = await this.getAll();
    return all.find((u) => u.id === id) ?? null;
  },

  async getByUsername(username: string): Promise<User | null> {
    const all = await this.getAll();
    return all.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
  },

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    const all = lsRead<User[]>(LS.users, []);
    all.push(user);
    lsWrite(LS.users, all);
    await supabase.from('users').insert(user);
    return user;
  },

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const all = lsRead<User[]>(LS.users, []);
    const idx = all.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    lsWrite(LS.users, all);
    await supabase.from('users').update(updates).eq('id', id);
    return all[idx];
  },

  async delete(id: string): Promise<boolean> {
    const all = lsRead<User[]>(LS.users, []);
    const filtered = all.filter((u) => u.id !== id);
    if (filtered.length === all.length) return false;
    lsWrite(LS.users, filtered);
    await supabase.from('users').delete().eq('id', id);
    return true;
  },
};

// ─── Activity Log ───────────────────────────────────────────
export const activityStorage = {
  async getAll(): Promise<ActivityLog[]> {
    const local = lsRead<ActivityLog[]>(LS.activity, []);
    const { data, error } = await supabase.from('activity').select('*');
    if (!error && data && data.length > 0) {
      lsWrite(LS.activity, data as ActivityLog[]);
      return data as ActivityLog[];
    }
    return local;
  },

  async getRecent(limit = 50): Promise<ActivityLog[]> {
    const all = await this.getAll();
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  },

  async log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: ActivityLog = { ...entry, id: generateId(), timestamp: new Date().toISOString() };
    const all = lsRead<ActivityLog[]>(LS.activity, []);
    all.unshift(logEntry);
    lsWrite(LS.activity, all);
    await supabase.from('activity').insert(logEntry);
  },
};

// ─── Import Batches ─────────────────────────────────────────
export const batchStorage = {
  async getAll(): Promise<ImportBatch[]> {
    const { data, error } = await supabase.from('batches').select('*');
    return handleResponse<ImportBatch[]>({ data, error }, []);
  },

  async create(data: Omit<ImportBatch, 'id'>): Promise<ImportBatch> {
    const { data: inserted, error } = await supabase.from('batches').insert(data).single();
    return handleResponse<ImportBatch>(
      { data: inserted, error },
      { ...(data as ImportBatch), id: generateId() }
    );
  },
};

// ─── Delivery Records ───────────────────────────────────────
export const deliveryStorage = {
  async getAll(): Promise<DeliveryRecord[]> {
    const { data, error } = await supabase.from('deliveries').select('*');
    return handleResponse<DeliveryRecord[]>({ data, error }, []);
  },

  async create(data: Omit<DeliveryRecord, 'id'>): Promise<DeliveryRecord> {
    const { data: inserted, error } = await supabase.from('deliveries').insert(data).single();
    return handleResponse<DeliveryRecord>(
      { data: inserted, error },
      { ...(data as DeliveryRecord), id: generateId() }
    );
  },

  async getByParcelId(parcelId: string): Promise<DeliveryRecord | null> {
    const { data, error } = await supabase.from('deliveries').select('*').eq('parcelId', parcelId).single();
    return error ? null : (data as DeliveryRecord);
  },
};

// ─── App Settings ───────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  officeName: 'Island Post Office',
  islandName: 'Malé, Maldives',
  contactNumber: '+960 300-0000',
  emailAddress: 'info@islandpost.mv',
  logoText: 'IslandPost',
  darkMode: false,
  autoBackup: true,
  sessionTimeout: 60,
};

export const settingsStorage = {
  async get(): Promise<AppSettings> {
    const local = lsRead<AppSettings | null>(LS.settings, null);
    const { data, error } = await supabase.from('settings').select('*').single();
    if (!error && data) {
      const merged = { ...DEFAULT_SETTINGS, ...(data as AppSettings) };
      lsWrite(LS.settings, merged);
      return merged;
    }
    return local ? { ...DEFAULT_SETTINGS, ...local } : DEFAULT_SETTINGS;
  },

  async save(settings: AppSettings): Promise<void> {
    lsWrite(LS.settings, settings);
    await supabase.from('settings').upsert({ id: 1, ...settings });
  },

  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated = { ...current, ...updates };
    await this.save(updated);
    return updated;
  },
};

// ─── Session Management ─────────────────────────────────────
export const sessionStorage2 = {
  async get(): Promise<AuthSession | null> {
    const sess = lsRead<AuthSession | null>(LS.session, null);
    if (!sess) return null;
    if (new Date(sess.expiresAt) < new Date()) {
      await this.clear();
      return null;
    }
    return sess;
  },

  async set(session: AuthSession): Promise<void> {
    lsWrite(LS.session, session);
  },

  async clear(): Promise<void> {
    localStorage.removeItem(LS.session);
  },
};

// ─── Database Backup & Restore ──────────────────────────────
export const backupRestore = {
  async exportAll(): Promise<string> {
    const [parcels, users, activity, batches, deliveries, settings] = await Promise.all([
      parcelStorage.getAll(),
      userStorage.getAll(),
      activityStorage.getAll(),
      batchStorage.getAll(),
      deliveryStorage.getAll(),
      settingsStorage.get(),
    ]);
    const backup = { version: '1.0', exportedAt: new Date().toISOString(), parcels, users, activity, batches, deliveries, settings };
    return JSON.stringify(backup, null, 2);
  },

  async importAll(json: string): Promise<{ success: boolean; message: string }> {
    try {
      const backup = JSON.parse(json);
      if (!backup.version) return { success: false, message: 'Invalid backup file format.' };
      if (backup.parcels) await supabase.from('parcels').upsert(backup.parcels);
      if (backup.users) await supabase.from('users').upsert(backup.users);
      if (backup.activity) await supabase.from('activity').upsert(backup.activity);
      if (backup.batches) await supabase.from('batches').upsert(backup.batches);
      if (backup.deliveries) await supabase.from('deliveries').upsert(backup.deliveries);
      if (backup.settings) await supabase.from('settings').upsert(backup.settings);
      return { success: true, message: 'Database restored successfully.' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to restore: invalid file.' };
    }
  },
};

// ─── Seed initial data ──────────────────────────────────────
export async function seedInitialData(): Promise<void> {
  const users = await userStorage.getAll();
  if (users.length > 0) return;

  const hashPassword = (pw: string) => btoa(pw + '_islandpost_salt');

  await userStorage.create({
    username: 'admin',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    fullName: 'System Administrator',
    isActive: true,
  });

  await userStorage.create({
    username: 'staff1',
    passwordHash: hashPassword('staff123'),
    role: 'staff',
    fullName: 'Ahmed Rasheed',
    isActive: true,
  });

  const demoParcels = [
    {
      trackingNumber: 'DHL-2024-001',
      customerName: 'Fathimath Ali',
      mobileNumber: '7891234',
      address: 'Hulhumale, Block A',
      island: 'Hulhumale',
      description: 'Electronics - Laptop',
      arrivalDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      courierName: 'DHL',
      status: 'Ready for Collection',
      remarks: 'Fragile - Handle with care',
      importBatchId: 'demo',
    },
    // Additional demo parcels can be added here
  ];

  await parcelStorage.bulkCreate(demoParcels as any);

  await activityStorage.log({
    userId: 'system',
    username: 'system',
    action: 'SYSTEM_INIT',
    target: 'database',
    details: 'Initial database seeded with demo data',
  });
}

export { generateId };
