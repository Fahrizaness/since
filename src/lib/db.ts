import { supabase } from './supabaseClient';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface Counter {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  start_date: string;
  emoji: string;
  is_private: boolean;
  created_at?: string;
  last_milestone_shown?: number | null;
}

export interface Activity {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  emoji: string;
  is_private: boolean;
  created_at?: string;
  // Computed di client
  last_done_date?: string;
}

export interface ActivityLog {
  id: string;
  activity_id: string;
  done_at: string;
}

export interface FutureGoal {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  target_date: string;
  status: boolean;
  is_private: boolean;
  created_at?: string;
}

// ID User tiruan untuk Mode Sandbox Lokal
const SANDBOX_USER_ID = 'sandbox-user-uuid-12345';

// Fungsi bantuan untuk latensi simulasi
const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mengubah objek Date atau string ISO menjadi format tanggal lokal YYYY-MM-DD
 */
export function toLocalDateString(dateInput: string | Date): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

/**
 * Mengubah format tanggal lokal YYYY-MM-DD menjadi objek Date di zona waktu lokal
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

async function isUsingSupabase(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// -------------------------------------------------------------
// FITUR: KATEGORI
// -------------------------------------------------------------
export const dbCategories = {
  async getAll(): Promise<Category[]> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      
      // Jika kosong, pre-seed kategori bawaan
      if (!data || data.length === 0) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const defaultCats = [
            { id: crypto.randomUUID(), user_id: userData.user.id, name: 'Personal', color: 'hsl(250, 89%, 65%)' },
            { id: crypto.randomUUID(), user_id: userData.user.id, name: 'Pekerjaan', color: 'hsl(187, 92%, 45%)' },
            { id: crypto.randomUUID(), user_id: userData.user.id, name: 'Kesehatan', color: 'hsl(142, 70%, 45%)' }
          ];
          const { data: inserted, error: insErr } = await supabase
            .from('categories')
            .insert(defaultCats)
            .select();
          if (!insErr && inserted) return inserted;
        }
      }
      return data || [];
    } else {
      await delay(100);
      const local = localStorage.getItem('since_categories');
      if (!local) {
        const defaultCats: Category[] = [
          { id: 'cat-personal', user_id: SANDBOX_USER_ID, name: 'Personal', color: 'hsl(250, 89%, 65%)' },
          { id: 'cat-pekerjaan', user_id: SANDBOX_USER_ID, name: 'Pekerjaan', color: 'hsl(187, 92%, 45%)' },
          { id: 'cat-kesehatan', user_id: SANDBOX_USER_ID, name: 'Kesehatan', color: 'hsl(142, 70%, 45%)' }
        ];
        localStorage.setItem('since_categories', JSON.stringify(defaultCats));
        return defaultCats;
      }
      return JSON.parse(local);
    }
  },

  async create(name: string, color: string): Promise<Category> {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      user_id: SANDBOX_USER_ID,
      name,
      color,
      created_at: new Date().toISOString()
    };

    if (await isUsingSupabase() && supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        newCategory.user_id = userData.user.id;
      }
      const { data, error } = await supabase
        .from('categories')
        .insert([newCategory])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay(100);
      const local = localStorage.getItem('since_categories');
      const list: Category[] = local ? JSON.parse(local) : [];
      list.push(newCategory);
      localStorage.setItem('since_categories', JSON.stringify(list));
      return newCategory;
    }
  },

  async update(id: string, name: string, color: string): Promise<Category> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay(100);
      const local = localStorage.getItem('since_categories');
      if (!local) throw new Error('Kategori tidak ditemukan');
      const list: Category[] = JSON.parse(local);
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Kategori tidak ditemukan');
      list[index] = {
        ...list[index],
        name,
        color
      };
      localStorage.setItem('since_categories', JSON.stringify(list));
      return list[index];
    }
  },

  async delete(id: string): Promise<void> {
    if (await isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      await delay(100);
      // 1. Hapus dari daftar kategori
      const localCats = localStorage.getItem('since_categories');
      if (localCats) {
        const list: Category[] = JSON.parse(localCats);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem('since_categories', JSON.stringify(filtered));
      }

      // 2. Set category_id menjadi null pada counters
      const localCounters = localStorage.getItem('since_counters');
      if (localCounters) {
        const list: Counter[] = JSON.parse(localCounters);
        const updated = list.map((item) => item.category_id === id ? { ...item, category_id: null } : item);
        localStorage.setItem('since_counters', JSON.stringify(updated));
      }

      // 3. Set category_id menjadi null pada activities
      const localActivities = localStorage.getItem('since_activities');
      if (localActivities) {
        const list: Activity[] = JSON.parse(localActivities);
        const updated = list.map((item) => item.category_id === id ? { ...item, category_id: null } : item);
        localStorage.setItem('since_activities', JSON.stringify(updated));
      }

      // 4. Set category_id menjadi null pada goals
      const localGoals = localStorage.getItem('since_goals');
      if (localGoals) {
        const list: FutureGoal[] = JSON.parse(localGoals);
        const updated = list.map((item) => item.category_id === id ? { ...item, category_id: null } : item);
        localStorage.setItem('since_goals', JSON.stringify(updated));
      }
    }
  }
};

// -------------------------------------------------------------
// FITUR: SEJAK (DAY COUNTER)
// -------------------------------------------------------------
export const dbCounters = {
  async getAll(): Promise<Counter[]> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      await delay();
      const local = localStorage.getItem('since_counters');
      return local ? JSON.parse(local) : [];
    }
  },

  async create(title: string, start_date: string, emoji: string, category_id: string | null, is_private: boolean): Promise<Counter> {
    const newCounter: Counter = {
      id: crypto.randomUUID(),
      user_id: SANDBOX_USER_ID,
      category_id,
      title,
      start_date,
      emoji,
      is_private,
      created_at: new Date().toISOString(),
    };

    if (await isUsingSupabase() && supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        newCounter.user_id = userData.user.id;
      }
      const { data, error } = await supabase
        .from('counters')
        .insert([newCounter])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay();
      const local = localStorage.getItem('since_counters');
      const list: Counter[] = local ? JSON.parse(local) : [];
      list.unshift(newCounter);
      localStorage.setItem('since_counters', JSON.stringify(list));
      return newCounter;
    }
  },

  async delete(id: string): Promise<void> {
    if (await isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('counters')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      await delay();
      const local = localStorage.getItem('since_counters');
      if (local) {
        const list: Counter[] = JSON.parse(local);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem('since_counters', JSON.stringify(filtered));
      }
    }
  },

  async update(id: string, title: string, start_date: string, emoji: string, category_id: string | null, is_private: boolean): Promise<Counter> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('counters')
        .update({ title, start_date, emoji, category_id, is_private })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay();
      const local = localStorage.getItem('since_counters');
      if (!local) throw new Error('Counter tidak ditemukan');
      const list: Counter[] = JSON.parse(local);
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Counter tidak ditemukan');
      list[index] = {
        ...list[index],
        title,
        start_date,
        emoji,
        category_id,
        is_private
      };
      localStorage.setItem('since_counters', JSON.stringify(list));
      return list[index];
    }
  },

  async updateMilestone(id: string, milestone: number): Promise<void> {
    if (await isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('counters')
        .update({ last_milestone_shown: milestone })
        .eq('id', id);
      if (error) {
        console.warn('Gagal update milestone di Supabase. Mungkin kolom belum ada:', error);
      }
    }
    
    // Selalu update di local storage sebagai cadangan
    const local = localStorage.getItem('since_counters');
    if (local) {
      const list: Counter[] = JSON.parse(local);
      const index = list.findIndex((item) => item.id === id);
      if (index !== -1) {
        list[index].last_milestone_shown = milestone;
        localStorage.setItem('since_counters', JSON.stringify(list));
      }
    }
  }
};

// -------------------------------------------------------------
// FITUR: TERAKHIR KALI (LAST TIME) - DENGAN LOG RIWAYAT
// -------------------------------------------------------------
export const dbActivities = {
  async getAll(): Promise<Activity[]> {
    if (await isUsingSupabase() && supabase) {
      // Ambil seluruh master aktivitas
      const { data: acts, error: actErr } = await supabase
        .from('activities')
        .select('*');
      if (actErr) throw actErr;

      // Ambil seluruh log aktivitas untuk menghitung tanggal terbaru
      const { data: logs, error: logsErr } = await supabase
        .from('activity_logs')
        .select('*')
        .order('done_at', { ascending: false });
      if (logsErr) throw logsErr;

      const mapped = (acts || []).map((act: Activity) => {
        const actLogs = (logs || []).filter((l: ActivityLog) => l.activity_id === act.id);
        const latestLog = actLogs[0];
        return {
          ...act,
          last_done_date: latestLog ? toLocalDateString(latestLog.done_at) : (act.created_at ? toLocalDateString(act.created_at) : toLocalDateString(new Date()))
        };
      });

      // Urutkan berdasarkan yang terlama tidak dilakukan
      return mapped.sort((a, b) => 
        parseLocalDate(a.last_done_date).getTime() - parseLocalDate(b.last_done_date).getTime()
      );
    } else {
      await delay();
      const localActs = localStorage.getItem('since_activities');
      const acts: Activity[] = localActs ? JSON.parse(localActs) : [];

      const localLogs = localStorage.getItem('since_activity_logs');
      const logs: ActivityLog[] = localLogs ? JSON.parse(localLogs) : [];

      const mapped = acts.map((act) => {
        const actLogs = logs
          .filter((l) => l.activity_id === act.id)
          .sort((a, b) => new Date(b.done_at).getTime() - new Date(a.done_at).getTime());
        const latestLog = actLogs[0];
        return {
          ...act,
          last_done_date: latestLog ? toLocalDateString(latestLog.done_at) : (act.created_at ? toLocalDateString(act.created_at) : toLocalDateString(new Date()))
        };
      });

      return mapped.sort((a, b) => 
        parseLocalDate(a.last_done_date || '').getTime() - parseLocalDate(b.last_done_date || '').getTime()
      );
    }
  },

  async create(title: string, initial_done_date: string, emoji: string, category_id: string | null, is_private: boolean): Promise<Activity> {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      user_id: SANDBOX_USER_ID,
      category_id,
      title,
      emoji,
      is_private,
      created_at: new Date().toISOString(),
    };

    if (await isUsingSupabase() && supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        newActivity.user_id = userData.user.id;
      }
      
      const { data, error } = await supabase
        .from('activities')
        .insert([newActivity])
        .select()
        .single();
      if (error) throw error;

      // Masukkan log awal
      const { error: logErr } = await supabase
        .from('activity_logs')
        .insert([{ activity_id: data.id, done_at: parseLocalDate(initial_done_date).toISOString() }]);
      if (logErr) throw logErr;

      return { ...data, last_done_date: initial_done_date };
    } else {
      await delay();
      const localActs = localStorage.getItem('since_activities');
      const acts: Activity[] = localActs ? JSON.parse(localActs) : [];
      acts.push(newActivity);
      localStorage.setItem('since_activities', JSON.stringify(acts));

      const localLogs = localStorage.getItem('since_activity_logs');
      const logs: ActivityLog[] = localLogs ? JSON.parse(localLogs) : [];
      logs.push({
        id: crypto.randomUUID(),
        activity_id: newActivity.id,
        done_at: new Date(initial_done_date).toISOString()
      });
      localStorage.setItem('since_activity_logs', JSON.stringify(logs));

      return { ...newActivity, last_done_date: initial_done_date };
    }
  },

  async reset(id: string): Promise<void> {
    const todayStr = new Date().toISOString();
    
    if (await isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('activity_logs')
        .insert([{ activity_id: id, done_at: todayStr }]);
      if (error) throw error;
    } else {
      await delay(200);
      const local = localStorage.getItem('since_activity_logs');
      const list: ActivityLog[] = local ? JSON.parse(local) : [];
      list.push({
        id: crypto.randomUUID(),
        activity_id: id,
        done_at: todayStr
      });
      localStorage.setItem('since_activity_logs', JSON.stringify(list));
    }
  },

  async getLogs(activityId: string): Promise<ActivityLog[]> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_id', activityId)
        .order('done_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      await delay(100);
      const local = localStorage.getItem('since_activity_logs');
      const logs: ActivityLog[] = local ? JSON.parse(local) : [];
      return logs
        .filter((l) => l.activity_id === activityId)
        .sort((a, b) => new Date(b.done_at).getTime() - new Date(a.done_at).getTime());
    }
  },

  async delete(id: string): Promise<void> {
    if (await isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      await delay();
      const localActs = localStorage.getItem('since_activities');
      if (localActs) {
        const list: Activity[] = JSON.parse(localActs);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem('since_activities', JSON.stringify(filtered));
      }
      
      // Hapus log terkait secara lokal
      const localLogs = localStorage.getItem('since_activity_logs');
      if (localLogs) {
        const list: ActivityLog[] = JSON.parse(localLogs);
        const filtered = list.filter((item) => item.activity_id !== id);
        localStorage.setItem('since_activity_logs', JSON.stringify(filtered));
      }
    }
  },

  async update(id: string, title: string, emoji: string, category_id: string | null, is_private: boolean): Promise<Activity> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('activities')
        .update({ title, emoji, category_id, is_private })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay();
      const local = localStorage.getItem('since_activities');
      if (!local) throw new Error('Aktivitas tidak ditemukan');
      const list: Activity[] = JSON.parse(local);
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Aktivitas tidak ditemukan');
      list[index] = {
        ...list[index],
        title,
        emoji,
        category_id,
        is_private
      };
      localStorage.setItem('since_activities', JSON.stringify(list));
      return list[index];
    }
  },

  async getAllLogs(): Promise<ActivityLog[]> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('done_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      await delay(100);
      const local = localStorage.getItem('since_activity_logs');
      return local ? JSON.parse(local) : [];
    }
  },

  async deleteLog(logId: string): Promise<void> {
    if (await isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('id', logId);
      if (error) throw error;
    } else {
      await delay(100);
      const local = localStorage.getItem('since_activity_logs');
      if (local) {
        const list: ActivityLog[] = JSON.parse(local);
        const filtered = list.filter((item) => item.id !== logId);
        localStorage.setItem('since_activity_logs', JSON.stringify(filtered));
      }
    }
  }
};

// -------------------------------------------------------------
// FITUR: MASA DEPAN (FUTURE TIMELINE)
// -------------------------------------------------------------
export const dbGoals = {
  async getAll(): Promise<FutureGoal[]> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('future_goals')
        .select('*')
        .order('target_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      await delay();
      const local = localStorage.getItem('since_goals');
      const list: FutureGoal[] = local ? JSON.parse(local) : [];
      return list.sort((a, b) => 
        parseLocalDate(a.target_date).getTime() - parseLocalDate(b.target_date).getTime()
      );
    }
  },

  async create(title: string, target_date: string, category_id: string | null, is_private: boolean): Promise<FutureGoal> {
    const newGoal: FutureGoal = {
      id: crypto.randomUUID(),
      user_id: SANDBOX_USER_ID,
      category_id,
      title,
      target_date,
      status: false,
      is_private,
      created_at: new Date().toISOString(),
    };

    if (await isUsingSupabase() && supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        newGoal.user_id = userData.user.id;
      }
      const { data, error } = await supabase
        .from('future_goals')
        .insert([newGoal])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay();
      const local = localStorage.getItem('since_goals');
      const list: FutureGoal[] = local ? JSON.parse(local) : [];
      list.push(newGoal);
      localStorage.setItem('since_goals', JSON.stringify(list));
      return newGoal;
    }
  },

  async toggleStatus(id: string, currentStatus: boolean): Promise<FutureGoal> {
    const newStatus = !currentStatus;
    
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('future_goals')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay(150);
      const local = localStorage.getItem('since_goals');
      if (!local) throw new Error('Target tidak ditemukan');
      const list: FutureGoal[] = JSON.parse(local);
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Target tidak ditemukan');
      
      list[index].status = newStatus;
      localStorage.setItem('since_goals', JSON.stringify(list));
      return list[index];
    }
  },

  async delete(id: string): Promise<void> {
    if (await isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('future_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      await delay();
      const local = localStorage.getItem('since_goals');
      if (local) {
        const list: FutureGoal[] = JSON.parse(local);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem('since_goals', JSON.stringify(filtered));
      }
    }
  },

  async update(id: string, title: string, target_date: string, category_id: string | null, is_private: boolean): Promise<FutureGoal> {
    if (await isUsingSupabase() && supabase) {
      const { data, error } = await supabase
        .from('future_goals')
        .update({ title, target_date, category_id, is_private })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay();
      const local = localStorage.getItem('since_goals');
      if (!local) throw new Error('Target tidak ditemukan');
      const list: FutureGoal[] = JSON.parse(local);
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Target tidak ditemukan');
      list[index] = {
        ...list[index],
        title,
        target_date,
        category_id,
        is_private
      };
      localStorage.setItem('since_goals', JSON.stringify(list));
      return list[index];
    }
  }
};
