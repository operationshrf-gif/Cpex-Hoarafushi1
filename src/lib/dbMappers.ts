// Maps between app types (camelCase) and Supabase rows (snake_case)

import type {
  Parcel,
  User,
  ActivityLog,
  ImportBatch,
  DeliveryRecord,
  AppSettings,
  ParcelStatus,
  UserRole,
} from '../types';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export interface ParcelRow {
  id: string;
  tracking_number: string;
  customer_name: string;
  mobile_number: string;
  address: string;
  island: string;
  description: string;
  arrival_date: string | null;
  courier_name: string;
  status: ParcelStatus;
  remarks: string;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  delivered_by: string | null;
  receiver_name: string | null;
  import_batch_id: string | null;
}

export interface ActivityRow {
  id: string;
  user_id: string;
  username: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

export interface SettingsRow {
  id: number;
  office_name: string;
  island_name: string;
  contact_number: string;
  email_address: string;
  logo_text: string;
  dark_mode: boolean;
  auto_backup: boolean;
  session_timeout: number;
}

export interface BatchRow {
  id: string;
  filename: string;
  imported_at: string;
  imported_by: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  errors: ImportBatch['errors'];
}

export interface DeliveryRow {
  id: string;
  parcel_id: string;
  tracking_number: string;
  customer_name: string;
  delivered_at: string;
  delivered_by: string;
  receiver_name: string;
  staff_notes: string | null;
}

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    fullName: row.full_name,
    createdAt: row.created_at,
    lastLogin: row.last_login ?? undefined,
    isActive: row.is_active,
  };
}

export function userToRow(user: User): UserRow {
  return {
    id: user.id,
    username: user.username,
    password_hash: user.passwordHash,
    role: user.role,
    full_name: user.fullName,
    created_at: user.createdAt,
    last_login: user.lastLogin ?? null,
    is_active: user.isActive,
  };
}

export function rowToParcel(row: ParcelRow): Parcel {
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    customerName: row.customer_name,
    mobileNumber: row.mobile_number ?? '',
    address: row.address ?? '',
    island: row.island ?? '',
    description: row.description ?? '',
    arrivalDate: row.arrival_date ?? '',
    courierName: row.courier_name ?? '',
    status: row.status,
    remarks: row.remarks ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveredAt: row.delivered_at ?? undefined,
    deliveredBy: row.delivered_by ?? undefined,
    receiverName: row.receiver_name ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
  };
}

export function parcelToRow(parcel: Parcel): ParcelRow {
  return {
    id: parcel.id,
    tracking_number: parcel.trackingNumber,
    customer_name: parcel.customerName,
    mobile_number: parcel.mobileNumber,
    address: parcel.address,
    island: parcel.island,
    description: parcel.description,
    arrival_date: parcel.arrivalDate || null,
    courier_name: parcel.courierName,
    status: parcel.status,
    remarks: parcel.remarks,
    created_at: parcel.createdAt,
    updated_at: parcel.updatedAt,
    delivered_at: parcel.deliveredAt ?? null,
    delivered_by: parcel.deliveredBy ?? null,
    receiver_name: parcel.receiverName ?? null,
    import_batch_id: parcel.importBatchId ?? null,
  };
}

export function rowToActivity(row: ActivityRow): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    action: row.action,
    target: row.target,
    details: row.details,
    timestamp: row.timestamp,
  };
}

export function activityToRow(log: ActivityLog): ActivityRow {
  return {
    id: log.id,
    user_id: log.userId,
    username: log.username,
    action: log.action,
    target: log.target,
    details: log.details,
    timestamp: log.timestamp,
  };
}

export function rowToSettings(row: SettingsRow): AppSettings {
  return {
    officeName: row.office_name,
    islandName: row.island_name,
    contactNumber: row.contact_number,
    emailAddress: row.email_address,
    logoText: row.logo_text,
    darkMode: row.dark_mode,
    autoBackup: row.auto_backup,
    sessionTimeout: row.session_timeout,
  };
}

export function settingsToRow(settings: AppSettings): Omit<SettingsRow, 'id'> {
  return {
    office_name: settings.officeName,
    island_name: settings.islandName,
    contact_number: settings.contactNumber,
    email_address: settings.emailAddress,
    logo_text: settings.logoText,
    dark_mode: settings.darkMode,
    auto_backup: settings.autoBackup,
    session_timeout: settings.sessionTimeout,
  };
}

export function rowToBatch(row: BatchRow): ImportBatch {
  return {
    id: row.id,
    filename: row.filename,
    importedAt: row.imported_at,
    importedBy: row.imported_by,
    totalRows: row.total_rows,
    successRows: row.success_rows,
    errorRows: row.error_rows,
    errors: row.errors ?? [],
  };
}

export function batchToRow(batch: ImportBatch): BatchRow {
  return {
    id: batch.id,
    filename: batch.filename,
    imported_at: batch.importedAt,
    imported_by: batch.importedBy,
    total_rows: batch.totalRows,
    success_rows: batch.successRows,
    error_rows: batch.errorRows,
    errors: batch.errors,
  };
}

export function rowToDelivery(row: DeliveryRow): DeliveryRecord {
  return {
    id: row.id,
    parcelId: row.parcel_id,
    trackingNumber: row.tracking_number,
    customerName: row.customer_name,
    deliveredAt: row.delivered_at,
    deliveredBy: row.delivered_by,
    receiverName: row.receiver_name,
    staffNotes: row.staff_notes ?? undefined,
  };
}

export function deliveryToRow(record: DeliveryRecord): DeliveryRow {
  return {
    id: record.id,
    parcel_id: record.parcelId,
    tracking_number: record.trackingNumber,
    customer_name: record.customerName,
    delivered_at: record.deliveredAt,
    delivered_by: record.deliveredBy,
    receiver_name: record.receiverName,
    staff_notes: record.staffNotes ?? null,
  };
}
