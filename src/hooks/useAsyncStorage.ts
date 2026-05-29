import { useState, useEffect, useCallback } from 'react';
import { parcelStorage, activityStorage, userStorage } from '../lib/storage';
import type { Parcel, ActivityLog, User } from '../types';

export function useParcels() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await parcelStorage.getAll();
      setParcels(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { parcels, loading, refresh };
}

export function useActivityRecent(limit = 20) {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await activityStorage.getRecent(limit);
      setActivity(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activity, loading, refresh };
}

export function useActivityAll() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await activityStorage.getAll();
      setLogs(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { logs, loading, refresh };
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userStorage.getAll();
      setUsers(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { users, loading, refresh };
}
