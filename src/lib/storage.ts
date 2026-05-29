// ============================================================
// IslandPost — Supabase + localStorage cache
// ============================================================

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  rowToUser,
  userToRow,
  rowToParcel,
  parcelToRow,
  rowToActivity,
  activityToRow,
  rowToSettings,
  settingsToRow,
  rowToBatch,
  batchToRow,
  rowToDelivery,
  deliveryToRow,
  type UserRow,
  type ParcelRow,
  type ActivityRow,
  type BatchRow,
  type DeliveryRow,
  type SettingsRow,
} from './dbMappers';
import type {
  Parcel,
  User,
  ActivityLog,
  ImportBatch,
  DeliveryRecord,
  AppSettings,
  AuthSession,
} from '../types';

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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function logSupabaseError(context: string, error: unknown): void {
  console.error(`[Supabase] ${context}:`, error);
}

// ─── Parcels ────────────────────────────────────────────────
export const parcelStorage = {
  async getAll(): Promise<Parcel[]> {
    if (!isSupabaseConfigured) {
      return lsRead<Parcel[]>(LS.parcels, []);
    }

    const { data, error } = await supabase.from('parcels').select('*');
    if (error) {
      logSupabaseError('parcels.getAll', error);
      return lsRead<Parcel[]>(LS.parcels, []);
    }

    const parcels = ((data ?? []) as ParcelRow[]).map(rowToParcel);
    lsWrite(LS.parcels, parcels);
    return parcels;
  },

  async getById(id: string): Promise<Parcel | null> {
    const all = await this.getAll();
    return all.find((p) => p.id === id) ?? null;
  },

  async getByTracking(trackingNumber: string): Promise<Parcel | null> {
    const tn = trackingNumber.toLowerCase().trim();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .ilike('tracking_number', tn)
        .maybeSingle();
      if (!error && data) return rowToParcel(data as ParcelRow);
    }

    const all = await this.getAll();
    return all.find((p) => p.trackingNumber.toLowerCase() === tn) ?? null;
  },

  async create(data: Omit<Parcel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Parcel> {
    const now = new Date().toISOString();
    const parcel: Parcel = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const row = parcelToRow(parcel);

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase
        .from('parcels')
        .insert(row)
        .select()
        .single();
      if (!error && inserted) {
        const created = rowToParcel(inserted as ParcelRow);
        const all = lsRead<Parcel[]>(LS.parcels, []);
        all.push(created);
        lsWrite(LS.parcels, all);
        return created;
      }
      logSupabaseError('parcels.create', error);
    }

    const all = lsRead<Parcel[]>(LS.parcels, []);
    all.push(parcel);
    lsWrite(LS.parcels, all);
    return parcel;
  },

  async update(id: string, updates: Partial<Parcel>): Promise<Parcel | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Parcel = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const row = parcelToRow(updated);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('parcels')
        .update(row)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const result = rowToParcel(data as ParcelRow);
        const all = lsRead<Parcel[]>(LS.parcels, []);
        const idx = all.findIndex((p) => p.id === id);
        if (idx >= 0) all[idx] = result;
        else all.push(result);
        lsWrite(LS.parcels, all);
        return result;
      }
      logSupabaseError('parcels.update', error);
    }

    const all = lsRead<Parcel[]>(LS.parcels, []);
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    all[idx] = updated;
    lsWrite(LS.parcels, all);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('parcels').delete().eq('id', id);
      if (error) logSupabaseError('parcels.delete', error);
    }

    const all = lsRead<Parcel[]>(LS.parcels, []);
    const filtered = all.filter((p) => p.id !== id);
    if (filtered.length === all.length) return false;
    lsWrite(LS.parcels, filtered);
    return true;
  },

  async bulkCreate(parcels: Omit<Parcel, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Parcel[]> {
    const now = new Date().toISOString();
    const created = parcels.map((p) => ({
      ...p,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }));
    const rows = created.map(parcelToRow);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('parcels').insert(rows).select();
      if (!error && data) {
        const result = (data as ParcelRow[]).map(rowToParcel);
        const all = lsRead<Parcel[]>(LS.parcels, []);
        lsWrite(LS.parcels, [...all, ...result]);
        return result;
      }
      logSupabaseError('parcels.bulkCreate', error);
    }

    const all = lsRead<Parcel[]>(LS.parcels, []);
    all.push(...created);
    lsWrite(LS.parcels, all);
    return created;
  },

  async search(query: string, field: string = 'all'): Promise<Parcel[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();

    const all = await this.getAll();
    return all.filter((p) => {
      const includes = (val: string) => val?.toLowerCase().includes(q);
      if (field === 'trackingNumber') return includes(p.trackingNumber);
      if (field === 'customerName') return includes(p.customerName);
      if (field === 'mobileNumber') return p.mobileNumber?.includes(q);
      if (field === 'island') return includes(p.island);
      if (field === 'address') return includes(p.address);
      return (
        includes(p.trackingNumber) ||
        includes(p.customerName) ||
        p.mobileNumber?.includes(q) ||
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
    if (!isSupabaseConfigured) {
      return lsRead<User[]>(LS.users, []);
    }

    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      logSupabaseError('users.getAll', error);
      return lsRead<User[]>(LS.users, []);
    }

    const users = ((data ?? []) as UserRow[]).map(rowToUser);
    lsWrite(LS.users, users);
    return users;
  },

  async getById(id: string): Promise<User | null> {
    const all = await this.getAll();
    return all.find((u) => u.id === id) ?? null;
  },

  async getByUsername(username: string): Promise<User | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (!error && data) return rowToUser(data as UserRow);
      if (error) logSupabaseError('users.getByUsername', error);
    }

    const all = await this.getAll();
    return all.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
  },

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    const row = userToRow(user);

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase
        .from('users')
        .insert(row)
        .select()
        .single();
      if (!error && inserted) {
        const created = rowToUser(inserted as UserRow);
        const all = lsRead<User[]>(LS.users, []);
        all.push(created);
        lsWrite(LS.users, all);
        return created;
      }
      logSupabaseError('users.create', error);
    }

    const all = lsRead<User[]>(LS.users, []);
    all.push(user);
    lsWrite(LS.users, all);
    return user;
  },

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: User = { ...existing, ...updates };
    const row = userToRow(updated);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .update(row)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const result = rowToUser(data as UserRow);
        const all = lsRead<User[]>(LS.users, []);
        const idx = all.findIndex((u) => u.id === id);
        if (idx >= 0) all[idx] = result;
        lsWrite(LS.users, all);
        return result;
      }
      logSupabaseError('users.update', error);
    }

    const all = lsRead<User[]>(LS.users, []);
    const idx = all.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    all[idx] = updated;
    lsWrite(LS.users, all);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) logSupabaseError('users.delete', error);
    }

    const all = lsRead<User[]>(LS.users, []);
    const filtered = all.filter((u) => u.id !== id);
    if (filtered.length === all.length) return false;
    lsWrite(LS.users, filtered);
    return true;
  },
};

// ─── Activity Log ───────────────────────────────────────────
export const activityStorage = {
  async getAll(): Promise<ActivityLog[]> {
    if (!isSupabaseConfigured) {
      return lsRead<ActivityLog[]>(LS.activity, []);
    }

    const { data, error } = await supabase.from('activity').select('*');
    if (error) {
      logSupabaseError('activity.getAll', error);
      return lsRead<ActivityLog[]>(LS.activity, []);
    }

    const logs = ((data ?? []) as ActivityRow[]).map(rowToActivity);
    lsWrite(LS.activity, logs);
    return logs;
  },

  async getRecent(limit = 50): Promise<ActivityLog[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (!error && data) {
        return (data as ActivityRow[]).map(rowToActivity);
      }
      logSupabaseError('activity.getRecent', error);
    }

    const all = await this.getAll();
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  },

  async log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: ActivityLog = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    const row = activityToRow(logEntry);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('activity').insert(row);
      if (error) logSupabaseError('activity.log', error);
    }

    const all = lsRead<ActivityLog[]>(LS.activity, []);
    all.unshift(logEntry);
    lsWrite(LS.activity, all);
  },
};

// ─── Import Batches ─────────────────────────────────────────
export const batchStorage = {
  async getAll(): Promise<ImportBatch[]> {
    if (!isSupabaseConfigured) {
      return lsRead<ImportBatch[]>(LS.batches, []);
    }

    const { data, error } = await supabase.from('batches').select('*');
    if (error) {
      logSupabaseError('batches.getAll', error);
      return lsRead<ImportBatch[]>(LS.batches, []);
    }

    const batches = ((data ?? []) as BatchRow[]).map(rowToBatch);
    lsWrite(LS.batches, batches);
    return batches;
  },

  async create(data: Omit<ImportBatch, 'id'>): Promise<ImportBatch> {
    const batch: ImportBatch = { ...data, id: generateId() };
    const row = batchToRow(batch);

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase
        .from('batches')
        .insert(row)
        .select()
        .single();
      if (!error && inserted) {
        const created = rowToBatch(inserted as BatchRow);
        const all = lsRead<ImportBatch[]>(LS.batches, []);
        all.push(created);
        lsWrite(LS.batches, all);
        return created;
      }
      logSupabaseError('batches.create', error);
    }

    const all = lsRead<ImportBatch[]>(LS.batches, []);
    all.push(batch);
    lsWrite(LS.batches, all);
    return batch;
  },
};

// ─── Delivery Records ───────────────────────────────────────
export const deliveryStorage = {
  async getAll(): Promise<DeliveryRecord[]> {
    if (!isSupabaseConfigured) {
      return lsRead<DeliveryRecord[]>(LS.deliveries, []);
    }

    const { data, error } = await supabase.from('deliveries').select('*');
    if (error) {
      logSupabaseError('deliveries.getAll', error);
      return lsRead<DeliveryRecord[]>(LS.deliveries, []);
    }

    const deliveries = ((data ?? []) as DeliveryRow[]).map(rowToDelivery);
    lsWrite(LS.deliveries, deliveries);
    return deliveries;
  },

  async create(data: Omit<DeliveryRecord, 'id'>): Promise<DeliveryRecord> {
    const record: DeliveryRecord = { ...data, id: generateId() };
    const row = deliveryToRow(record);

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase
        .from('deliveries')
        .insert(row)
        .select()
        .single();
      if (!error && inserted) {
        const created = rowToDelivery(inserted as DeliveryRow);
        const all = lsRead<DeliveryRecord[]>(LS.deliveries, []);
        all.push(created);
        lsWrite(LS.deliveries, all);
        return created;
      }
      logSupabaseError('deliveries.create', error);
    }

    const all = lsRead<DeliveryRecord[]>(LS.deliveries, []);
    all.push(record);
    lsWrite(LS.deliveries, all);
    return record;
  },

  async getByParcelId(parcelId: string): Promise<DeliveryRecord | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('parcel_id', parcelId)
        .maybeSingle();
      if (!error && data) return rowToDelivery(data as DeliveryRow);
    }

    const all = await this.getAll();
    return all.find((d) => d.parcelId === parcelId) ?? null;
  },
};

// ─── App Settings ───────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  officeName: 'Cpex Hoarafushi',
  islandName: 'Hoarafushi, Maldives',
  contactNumber: '+960 300-0000',
  emailAddress: 'info@islandpost.mv',
  logoText: 'IslandPost',
  darkMode: false,
  autoBackup: true,
  sessionTimeout: 60,
};

export const settingsStorage = {
  async get(): Promise<AppSettings> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (!error && data) {
        const merged = { ...DEFAULT_SETTINGS, ...rowToSettings(data as SettingsRow) };
        lsWrite(LS.settings, merged);
        return merged;
      }
      if (error) logSupabaseError('settings.get', error);
    }

    const local = lsRead<AppSettings | null>(LS.settings, null);
    return local ? { ...DEFAULT_SETTINGS, ...local } : DEFAULT_SETTINGS;
  },

  async save(settings: AppSettings): Promise<void> {
    lsWrite(LS.settings, settings);

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: 1, ...settingsToRow(settings) });
      if (error) logSupabaseError('settings.save', error);
    }
  },

  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated = { ...current, ...updates };
    await this.save(updated);
    return updated;
  },
};

// ─── Session (browser-only; not stored in Supabase) ─────────
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

// ─── Push local cache → Supabase (one-time migration) ───────
export async function syncLocalCacheToSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const remoteUsers = await supabase.from('users').select('id', { count: 'exact', head: true });
    if (remoteUsers.error || (remoteUsers.count ?? 0) > 0) return;
  } catch {
    return;
  }

  const localUsers = lsRead<User[]>(LS.users, []);
  const localParcels = lsRead<Parcel[]>(LS.parcels, []);
  const localActivity = lsRead<ActivityLog[]>(LS.activity, []);

  if (localUsers.length === 0 && localParcels.length === 0) return;

  try {
    if (localUsers.length > 0) {
      await supabase.from('users').upsert(localUsers.map(userToRow));
    }
    if (localParcels.length > 0) {
      await supabase.from('parcels').upsert(localParcels.map(parcelToRow));
    }
    if (localActivity.length > 0) {
      await supabase.from('activity').upsert(localActivity.map(activityToRow));
    }
  } catch (err) {
    logSupabaseError('syncLocalCacheToSupabase', err);
  }
}

// ─── Backup & Restore ───────────────────────────────────────
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
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        parcels,
        users,
        activity,
        batches,
        deliveries,
        settings,
      },
      null,
      2
    );
  },

  async importAll(json: string): Promise<{ success: boolean; message: string }> {
    try {
      const backup = JSON.parse(json);
      if (!backup.version) return { success: false, message: 'Invalid backup file format.' };

      if (backup.parcels?.length) {
        await parcelStorage.bulkCreate(
          backup.parcels.map((p: Parcel) => {
            const { id, createdAt, updatedAt, ...rest } = p;
            return rest;
          })
        );
      }
      if (backup.users?.length) {
        for (const u of backup.users as User[]) {
          const { id, createdAt, ...rest } = u;
          await userStorage.create(rest);
        }
      }
      if (backup.settings) {
        await settingsStorage.save({ ...DEFAULT_SETTINGS, ...backup.settings });
      }

      return { success: true, message: 'Database restored successfully.' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Failed to restore: invalid file.' };
    }
  },
};

// ─── Seed (only when DB is empty) ───────────────────────────
export async function seedInitialData(): Promise<void> {
  await syncLocalCacheToSupabase();

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

  await parcelStorage.bulkCreate([
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
  ] as Omit<Parcel, 'id' | 'createdAt' | 'updatedAt'>[]);

  await activityStorage.log({
    userId: 'system',
    username: 'system',
    action: 'SYSTEM_INIT',
    target: 'database',
    details: 'Initial database seeded with demo data',
  });
}

export { generateId, isSupabaseConfigured };
