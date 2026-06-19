import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { dbCounters, dbActivities, dbGoals, dbCategories } from './lib/db';
import type { Counter, Activity, FutureGoal, Category, ActivityLog } from './lib/db';
import type { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SejakTab } from './components/SejakTab';
import { TerakhirTab } from './components/TerakhirTab';
import { MasaDepanTab } from './components/MasaDepanTab';
import { SettingsModal } from './components/SettingsModal';
import { KategoriTab } from './components/KategoriTab';

function App() {
  // Sesi pengguna (dari Supabase)
  const [session, setSession] = useState<Session | null>(null);
  
  // Status loading autentikasi awal
  const [authLoading, setAuthLoading] = useState(true);

  // State untuk PWA Install Prompt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Tab aktif saat ini
  const [activeTab, setActiveTab] = useState('dashboard');

  // State data utama
  const [categories, setCategories] = useState<Category[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<FutureGoal[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // State untuk PWA App Shortcuts auto-open modal
  const [autoOpenAddModal, setAutoOpenAddModal] = useState(false);
  
  // Status loading data
  const [dataLoading, setDataLoading] = useState(false);

  // State Pengaturan & Tema Baru (dark, light, system)
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    const saved = localStorage.getItem('since_theme');
    return (saved === 'dark' || saved === 'light' || saved === 'system') ? saved : 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [username, setUsername] = useState('Pengguna');
  const [showSettings, setShowSettings] = useState(false);

  // 1. Deteksi sesi autentikasi awal dan pantau perubahan auth
  useEffect(() => {
    if (!supabase) {
      const timer = setTimeout(() => {
        setAuthLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        setSession(session);
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setSession(session);
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1.5. Selesaikan tema sistem & set resolvedTheme
  useEffect(() => {
    if (theme === 'system') {
      const getSystemTheme = () => 
        window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      
      const timer = setTimeout(() => {
        setResolvedTheme(getSystemTheme());
      }, 0);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'light' : 'dark');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => {
        clearTimeout(timer);
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      const timer = setTimeout(() => {
        setResolvedTheme(theme);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [theme]);

  // 2. Terapkan Tema ke Elemen HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // 2.5. Deteksi Event PWA Install & Standalone Mode
  useEffect(() => {
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           // eslint-disable-next-line @typescript-eslint/no-explicit-any
                           (navigator as any).standalone === true;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !((window as any).MSStream);

    const timer = setTimeout(() => {
      setIsStandalone(standaloneMode);
      setIsIOS(checkIOS);

      if (standaloneMode) return;

      if (checkIOS) {
        const isDismissed = sessionStorage.getItem('since_install_prompt_dismissed');
        if (!isDismissed) {
          setShowInstallBanner(true);
        }
      }
    }, 0);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isDismissed = sessionStorage.getItem('since_install_prompt_dismissed');
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleDismissInstallBanner = () => {
    sessionStorage.setItem('since_install_prompt_dismissed', 'true');
    setShowInstallBanner(false);
  };

  // 2.7. Deteksi parameter URL untuk PWA App Shortcuts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const action = params.get('action');

    const timer = setTimeout(() => {
      if (tab === 'terakhir') {
        setActiveTab('terakhir');
      } else if (action === 'add-counter') {
        setActiveTab('sejak');
        setAutoOpenAddModal(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // 2.8. PWA Badging API - Menampilkan jumlah aktivitas tertunda (> 14 hari) pada ikon homescreen
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;

    const getDaysSince = (dateStr: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDone = new Date(dateStr);
      lastDone.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - lastDone.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const pendingCount = activities.filter(activity => {
      if (activity.last_done_date) {
        const gap = getDaysSince(activity.last_done_date);
        return gap > 14;
      }
      return false;
    }).length;

    try {
      if (pendingCount > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).setAppBadge(pendingCount);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).clearAppBadge();
      }
    } catch (err) {
      console.warn('Gagal memproses Badging API:', err);
    }
  }, [activities]);

  // 3. Muat Username berdasarkan Status Auth (Supabase Metadata)
  useEffect(() => {
    if (session) {
      const sbUsername = session.user?.user_metadata?.username;
      const timer = setTimeout(() => {
        setUsername(sbUsername || session.user.email?.split('@')[0] || 'Pengguna');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session]);

  // 4. Fetch seluruh data dari db wrapper
  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [cats, c, g, actsData, logsData] = await Promise.all([
        dbCategories.getAll(),
        dbCounters.getAll(),
        dbGoals.getAll(),
        dbActivities.getAll(),
        dbActivities.getAllLogs()
      ]);

      setCategories(cats);
      setCounters(c);
      setGoals(g);
      setActivities(actsData);
      setActivityLogs(logsData);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        fetchAllData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session]);

  // 5. Handlers untuk manipulasi data (Fitur Sejak)
  const handleCreateCounter = async (title: string, startDate: string, emoji: string, categoryId: string | null, isPrivate: boolean) => {
    try {
      await dbCounters.create(title, startDate, emoji, categoryId, isPrivate);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal membuat counter:', err);
    }
  };

  const handleDeleteCounter = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus momen ini?')) {
      try {
        await dbCounters.delete(id);
        await fetchAllData();
      } catch (err) {
        console.error('Gagal menghapus counter:', err);
      }
    }
  };

  const handleUpdateCounter = async (id: string, title: string, startDate: string, emoji: string, categoryId: string | null, isPrivate: boolean) => {
    try {
      await dbCounters.update(id, title, startDate, emoji, categoryId, isPrivate);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal memperbarui counter:', err);
    }
  };

  const handleUpdateMilestone = async (id: string, milestone: number) => {
    try {
      await dbCounters.updateMilestone(id, milestone);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal memperbarui milestone counter:', err);
    }
  };

  // 6. Handlers untuk manipulasi data (Fitur Terakhir Kali)
  const handleCreateActivity = async (title: string, lastDoneDate: string, emoji: string, categoryId: string | null, isPrivate: boolean) => {
    try {
      await dbActivities.create(title, lastDoneDate, emoji, categoryId, isPrivate);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal membuat aktivitas:', err);
    }
  };

  const handleResetActivity = async (id: string) => {
    try {
      await dbActivities.reset(id);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal reset aktivitas:', err);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus aktivitas ini?')) {
      try {
        await dbActivities.delete(id);
        await fetchAllData();
      } catch (err) {
        console.error('Gagal menghapus aktivitas:', err);
      }
    }
  };

  const handleUpdateActivity = async (id: string, title: string, emoji: string, categoryId: string | null, isPrivate: boolean) => {
    try {
      await dbActivities.update(id, title, emoji, categoryId, isPrivate);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal memperbarui aktivitas:', err);
    }
  };

  // 7. Handlers untuk manipulasi data (Fitur Masa Depan)
  const handleCreateGoal = async (title: string, targetDate: string, categoryId: string | null, isPrivate: boolean) => {
    try {
      await dbGoals.create(title, targetDate, categoryId, isPrivate);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal membuat target:', err);
    }
  };

  const handleToggleGoalStatus = async (id: string, currentStatus: boolean) => {
    try {
      await dbGoals.toggleStatus(id, currentStatus);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal mengubah status target:', err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus target ini?')) {
      try {
        await dbGoals.delete(id);
        await fetchAllData();
      } catch (err) {
        console.error('Gagal menghapus target:', err);
      }
    }
  };

  const handleUpdateGoal = async (id: string, title: string, targetDate: string, categoryId: string | null, isPrivate: boolean) => {
    try {
      await dbGoals.update(id, title, targetDate, categoryId, isPrivate);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal memperbarui target:', err);
    }
  };

  // Handlers untuk Kategori
  const handleCreateCategory = async (name: string, color: string) => {
    try {
      await dbCategories.create(name, color);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal membuat kategori:', err);
    }
  };

  const handleUpdateCategory = async (id: string, name: string, color: string) => {
    try {
      await dbCategories.update(id, name, color);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal memperbarui kategori:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await dbCategories.delete(id);
      await fetchAllData();
    } catch (err) {
      console.error('Gagal menghapus kategori:', err);
    }
  };

  // 8. Alur Onboarding (Quick Add Template)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleQuickAddTemplate = async (templateType: 'counter' | 'activity' | 'goal', template: any) => {
    try {
      let categoryId: string | null = null;
      const existingCat = categories.find(c => c.name.toLowerCase() === template.category.toLowerCase());
      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const colors: { [key: string]: string } = {
          personal: 'hsl(250, 89%, 65%)',
          pekerjaan: 'hsl(187, 92%, 45%)',
          kesehatan: 'hsl(142, 70%, 45%)'
        };
        const color = colors[template.category.toLowerCase()] || 'hsl(200, 70%, 55%)';
        const newCat = await dbCategories.create(template.category, color);
        categoryId = newCat.id;
      }

      if (templateType === 'counter') {
        const yearsAgo = template.yearsAgo || 1;
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - yearsAgo);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        await dbCounters.create(template.title, pastDateStr, template.emoji, categoryId, template.isPrivate);
      } else if (templateType === 'activity') {
        const daysAgo = template.daysAgo || 3;
        const lastDoneDate = new Date();
        lastDoneDate.setDate(lastDoneDate.getDate() - daysAgo);
        const lastDoneDateStr = lastDoneDate.toISOString().split('T')[0];

        await dbActivities.create(template.title, lastDoneDateStr, template.emoji, categoryId, template.isPrivate);
      } else if (templateType === 'goal') {
        const monthsInFuture = template.monthsInFuture || 6;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + monthsInFuture);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        await dbGoals.create(template.title, targetDateStr, categoryId, template.isPrivate);
      }

      await fetchAllData();
    } catch (err) {
      console.error('Gagal menambahkan starter template:', err);
    }
  };

  // 9. Alur Edit Username & Toggle Tema
  const handleUpdateUsername = async (newUsername: string) => {
    try {
      if (session && supabase) {
        const { error } = await supabase.auth.updateUser({
          data: { username: newUsername }
        });
        if (error) throw error;
        
        // Refresh session agar state ter-update instan
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (refreshedSession) {
          setSession(refreshedSession);
        }
      } else {
        localStorage.setItem('since_username', newUsername);
      }
      setUsername(newUsername);
    } catch (err) {
      console.error('Gagal menyimpan nama panggilan:', err);
      throw err;
    }
  };

  const handleUpdatePin = async (newPin: string) => {
    try {
      if (session && supabase) {
        // 1. Update password to be the PIN code string
        const { error: passError } = await supabase.auth.updateUser({
          password: newPin
        });
        if (passError) throw passError;

        // 2. Set user metadata flag indicating has_pin is configured
        const { error: metaError } = await supabase.auth.updateUser({
          data: { 
            ...session.user.user_metadata,
            has_pin: true 
          }
        });
        if (metaError) throw metaError;

        // Refresh session to get updated user_metadata in state
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (refreshedSession) {
          setSession(refreshedSession);
        }
      }
    } catch (err) {
      console.error('Gagal memperbarui PIN keamanan:', err);
      throw err;
    }
  };

  const handleUpdateTheme = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('since_theme', newTheme);
  };

  // 10. Alur Autentikasi / Sandbox Switcher
  const handleAuthSuccess = (newSession: Session) => {
    setSession(newSession);
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  // Tampilan loading awal
  if (authLoading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          height: '100vh', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'var(--bg-app)' 
        }}
      >
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  // Tampilkan layar login
  if (!session) {
    return (
      <Auth 
        onAuthSuccess={handleAuthSuccess}
        resolvedTheme={resolvedTheme}
      />
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            categories={categories}
            counters={counters}
            activities={activities}
            goals={goals}
            activityLogs={activityLogs}
            onResetActivity={handleResetActivity}
            onQuickAddTemplate={handleQuickAddTemplate}
            userEmail={username} // Kirim username langsung untuk salam personal
            setActiveTab={setActiveTab}
            onUpdateMilestone={handleUpdateMilestone}
          />
        );
      case 'sejak':
        return (
          <SejakTab 
            categories={categories}
            counters={counters}
            onCreateCounter={handleCreateCounter}
            onUpdateCounter={handleUpdateCounter}
            onDeleteCounter={handleDeleteCounter}
            loading={dataLoading}
            autoOpenAddModal={autoOpenAddModal}
            onClearAutoOpen={() => setAutoOpenAddModal(false)}
          />
        );
      case 'terakhir':
        return (
          <TerakhirTab 
            categories={categories}
            activities={activities}
            onCreateActivity={handleCreateActivity}
            onUpdateActivity={handleUpdateActivity}
            onResetActivity={handleResetActivity}
            onDeleteActivity={handleDeleteActivity}
            loading={dataLoading}
          />
        );
      case 'masa-depan':
        return (
          <MasaDepanTab 
            categories={categories}
            goals={goals}
            onCreateGoal={handleCreateGoal}
            onUpdateGoal={handleUpdateGoal}
            onToggleGoalStatus={handleToggleGoalStatus}
            onDeleteGoal={handleDeleteGoal}
            loading={dataLoading}
          />
        );
      case 'kategori':
        return (
          <KategoriTab 
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            loading={dataLoading}
          />
        );
      default:
        return <div>Tab tidak ditemukan</div>;
    }
  };

  return (
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
      >
        {/* PWA Install Banner */}
        {showInstallBanner && !isStandalone && (
          <div className="pwa-install-banner animate-fade-in">
            <div className="pwa-banner-content">
              <span className="pwa-logo-wrapper">S</span>
              <div className="pwa-text-info">
                <span className="pwa-title">Instal Aplikasi Since</span>
                <span className="pwa-desc">
                  {isIOS 
                    ? 'Klik tombol "Bagikan" lalu pilih "Tambah ke Layar Utama".' 
                    : 'Instal di layar utama untuk akses offline & performa stabil.'}
                </span>
              </div>
            </div>
            <div className="pwa-actions">
              <button onClick={handleDismissInstallBanner} className="pwa-btn-dismiss">Tutup</button>
              {!isIOS && (
                <button onClick={handleInstallClick} className="pwa-btn-install">Instal</button>
              )}
            </div>
          </div>
        )}

        {renderTabContent()}
      </Layout>

      {/* MODAL SETTINGS APLIKASI */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        username={username}
        onUpdateUsername={handleUpdateUsername}
        theme={theme}
        onChangeTheme={handleUpdateTheme}
        hasPin={!!session?.user?.user_metadata?.has_pin}
        onUpdatePin={handleUpdatePin}
        onSignOut={handleSignOut}
      />
    </>
  );
}

export default App;
