import React, { useState, useEffect } from 'react';
import type { Counter, Activity, FutureGoal, Category, ActivityLog } from '../lib/db';
import { PrivacyWrapper } from './PrivacyWrapper';
import { AlertCircle, Sparkles, RefreshCw, PlusCircle } from 'lucide-react';

interface DashboardProps {
  categories: Category[];
  counters: Counter[];
  activities: Activity[];
  goals: FutureGoal[];
  activityLogs: ActivityLog[];
  onResetActivity: (id: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onQuickAddTemplate: (type: 'counter' | 'activity' | 'goal', template: any) => Promise<void>;
  userEmail: string | null;
  setActiveTab: (tab: string) => void;
  onUpdateMilestone: (id: string, milestone: number) => Promise<void>;
}

// Data template starter untuk Onboarding
const STARTER_TEMPLATES = [
  {
    type: 'counter' as const,
    title: 'Hari Kelahiran Saya',
    emoji: '👶',
    category: 'Personal',
    yearsAgo: 25,
    isPrivate: false,
    meta: 'Menghitung waktu sejak Anda lahir'
  },
  {
    type: 'counter' as const,
    title: 'Mulai Pertama Bekerja',
    emoji: '💼',
    category: 'Pekerjaan',
    yearsAgo: 2,
    isPrivate: false,
    meta: 'Menghitung masa bakti karier Anda'
  },
  {
    type: 'activity' as const,
    title: 'Telepon Orang Tua',
    emoji: '📞',
    category: 'Personal',
    daysAgo: 5,
    isPrivate: false,
    meta: 'Terakhir kali menghubungi orang tua'
  },
  {
    type: 'activity' as const,
    title: 'Olahraga Fisik',
    emoji: '🏋️',
    category: 'Kesehatan',
    daysAgo: 7,
    isPrivate: false,
    meta: 'Terakhir kali melatih kebugaran tubuh'
  },
  {
    type: 'goal' as const,
    title: 'Wisuda Kelulusan S1',
    emoji: '🎓',
    category: 'Pekerjaan',
    monthsInFuture: 10,
    isPrivate: false,
    meta: 'Target kelulusan jenjang sarjana'
  },
  {
    type: 'goal' as const,
    title: 'Tabungan Darurat 50 Juta',
    emoji: '💰',
    category: 'Personal',
    monthsInFuture: 18,
    isPrivate: true,
    meta: 'Target finansial privat'
  }
];

export const Dashboard: React.FC<DashboardProps> = ({
  categories,
  counters,
  activities,
  goals,
  activityLogs = [],
  onResetActivity,
  onQuickAddTemplate,
  userEmail,
  setActiveTab,
  onUpdateMilestone
}) => {
  // State filter kategori aktif (null = Semua)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [addingTemplateIndex, setAddingTemplateIndex] = useState<number | null>(null);

  // States untuk Milestone & Refleksi
  const [activeMilestone, setActiveMilestone] = useState<{ counter: Counter; elapsed: number } | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [savingReflection, setSavingReflection] = useState(false);

  // 1. Dapatkan salam ramah berdasarkan jam local
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Selamat Pagi';
    if (hour >= 12 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getDisplayName = () => {
    if (!userEmail) return 'Pengguna';
    return userEmail.split('@')[0];
  };

  // Monitor counters untuk memicu modal milestone
  useEffect(() => {
    const calculateElapsedDays = (startDateStr: string) => {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const getPendingMilestone = () => {
      for (const c of counters) {
        const elapsed = calculateElapsedDays(c.start_date);
        const isMilestone = elapsed === 30 || elapsed === 365 || (elapsed % 100 === 0 && elapsed > 0);
        if (isMilestone && c.last_milestone_shown !== elapsed) {
          return { counter: c, elapsed };
        }
      }
      return null;
    };

    const pending = getPendingMilestone();
    const timer = setTimeout(() => {
      if (pending) {
        setActiveMilestone(pending);
      } else {
        setActiveMilestone(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [counters]);

  // 2. Filter data berdasarkan kategori yang dipilih
  const filteredCounters = selectedCategoryId
    ? counters.filter(c => c.category_id === selectedCategoryId)
    : counters;

  const filteredActivities = selectedCategoryId
    ? activities.filter(a => a.category_id === selectedCategoryId)
    : activities;

  const filteredGoals = selectedCategoryId
    ? goals.filter(g => g.category_id === selectedCategoryId)
    : goals;

  // 3. Kalkulasi statistik (berdasarkan filter)
  const activeCountersCount = filteredCounters.length;
  const activitiesCount = filteredActivities.length;
  const futureGoalsCount = filteredGoals.filter(g => !g.status).length;

  // Cek apakah data benar-benar kosong di seluruh aplikasi (Onboarding State)
  const isOverallEmpty = counters.length === 0 && activities.length === 0 && goals.length === 0;

  // 4. Cari Aktivitas Terlama (Spotlight)
  // activities sudah diurutkan dari terlama di db.ts
  const spotlightActivity = filteredActivities[0] || null;

  // Kalkulasi selisih hari untuk aktivitas
  const getDaysSince = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDone = new Date(dateStr);
    lastDone.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - lastDone.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 5. Cari Target Terdekat (Spotlight)
  // goals sudah diurutkan kronologis di db.ts
  const spotlightGoal = filteredGoals.find(g => !g.status) || null;

  // Kalkulasi sisa hari untuk target
  const getDaysRemaining = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleQuickReset = async (id: string) => {
    setResettingId(id);
    try {
      await onResetActivity(id);
    } catch (e) {
      console.error(e);
    } finally {
      setResettingId(null);
    }
  };

  const handleAddTemplate = async (template: typeof STARTER_TEMPLATES[0], index: number) => {
    setAddingTemplateIndex(index);
    try {
      await onQuickAddTemplate(template.type, template);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTemplateIndex(null);
    }
  };

  // 3.5. Kalkulasi Smart Nudge (Today's Insight)
  const getSmartNudge = () => {
    if (activities.length === 0) {
      return "Mari mulai catat momen berharga dan kebiasaan positif kamu hari ini.";
    }

    const inactiveNudges: string[] = [];
    const activeNudges: string[] = [];

    activities.forEach(activity => {
      if (activity.last_done_date) {
        const gap = getDaysSince(activity.last_done_date);
        if (gap > 14) {
          inactiveNudges.push(`Sudah ${gap} hari kamu tidak ${activity.title}. Mungkin hari ini waktu yang pas?`);
        } else if (gap <= 7) {
          activeNudges.push(`Konsistensimu untuk ${activity.title} minggu ini sangat baik. Pertahankan!`);
        }
      }
    });

    if (inactiveNudges.length > 0) {
      return inactiveNudges[0];
    }
    if (activeNudges.length > 0) {
      return activeNudges[0];
    }

    return "Langkah kecil setiap hari akan membentuk kebiasaan yang luar biasa.";
  };

  const todayInsight = getSmartNudge();

  // Generate dates for the heatmap (last 12 weeks starting from Sunday)
  const getHeatmapData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Dapatkan tanggal 11 minggu yang lalu (77 hari lalu)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 77);
    
    // Mundur ke hari Minggu terdekat di belakang (0 = Minggu)
    const day = startDate.getDay();
    const diffToSunday = day;
    startDate.setDate(startDate.getDate() - diffToSunday);

    // Buat daftar seluruh tanggal dalam rentang tersebut
    const dateList: Date[] = [];
    const curr = new Date(startDate);
    while (curr <= today) {
      dateList.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    // Filter log berdasarkan kategori aktif
    const filteredLogs = activityLogs.filter(log => {
      // Cari aktivitas terkait log ini
      const activity = activities.find(a => a.id === log.activity_id);
      if (!activity) return false;

      // Jika kategori dipilih, filter berdasarkan kategori
      if (selectedCategoryId && activity.category_id !== selectedCategoryId) {
        return false;
      }
      return true;
    });

    // Petakan jumlah log ke masing-masing tanggal
    const logCountsByDate: { [key: string]: number } = {};
    filteredLogs.forEach(log => {
      const dateStr = log.done_at.split('T')[0];
      logCountsByDate[dateStr] = (logCountsByDate[dateStr] || 0) + 1;
    });

    // Bangun daftar sel dengan level intensitas
    return dateList.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const count = logCountsByDate[dateStr] || 0;
      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count >= 3) level = 3;

      return {
        date: date,
        dateStr: dateStr,
        count: count,
        level: level
      };
    });
  };

  const heatmapCells = getHeatmapData();

  return (
    <>
      <div className="tab-content animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* BAGIAN SALAM & TAGLINE */}
      <div className="greeting-section">
        <h2 className="greeting-text">
          {getGreeting()}, <span style={{ color: 'var(--color-primary)' }}>{getDisplayName()}</span>
        </h2>
        <p className="tagline-text">
          Since. Karena setiap perjalanan memiliki awal.
        </p>
      </div>

      {/* TODAY'S INSIGHT / SMART NUDGE */}
      <div className="glass-card animate-slide-up" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid var(--color-primary)' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          <Sparkles size={14} style={{ color: 'var(--color-primary)' }} /> Today's Insight
        </h4>
        <p style={{ fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.4, color: 'var(--text-primary)' }}>
          {todayInsight}
        </p>
      </div>

      {/* FILTER BAR KATEGORI (Hanya tampil jika ada kategori dan tidak kosong secara keseluruhan) */}
      {!isOverallEmpty && (
        <div className="category-filter-bar">
          <button 
            className={`filter-pill ${selectedCategoryId === null ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId(null)}
          >
            Semua Aspek
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`filter-pill ${selectedCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              <span className="filter-dot" style={{ backgroundColor: cat.color }}></span>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ONBOARDING STATE (Starter Templates) */}
      {isOverallEmpty ? (
        <div className="onboarding-container animate-fade-in">
          <h3 className="onboarding-title">
            ✨ Mulai Perjalanan Waktu Anda
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '-8px 0 8px', lineHeight: 1.4 }}>
            Pilih salah satu starter template di bawah ini untuk menambahkan peristiwa penting atau kebiasaan pertama Anda secara instan!
          </p>

          <div className="templates-grid">
            {STARTER_TEMPLATES.map((template, idx) => (
              <div 
                key={idx} 
                className="template-card"
                onClick={() => addingTemplateIndex === null && handleAddTemplate(template, idx)}
              >
                <div className="template-info">
                  <div className="template-emoji">{template.emoji}</div>
                  <div className="template-text">
                    <span className="template-name">{template.title}</span>
                    <span className="template-meta">
                      {template.category} • {template.meta}
                    </span>
                  </div>
                </div>

                <button 
                  className="btn-icon" 
                  style={{ color: 'var(--color-primary)' }}
                  disabled={addingTemplateIndex !== null}
                >
                  {addingTemplateIndex === idx ? (
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                  ) : (
                    <PlusCircle size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* GRID HEATMAP AKTIVITAS (Since v1.14) */}
          <div className="glass-card heatmap-card animate-slide-up">
            <h4 className="heatmap-title">
              📊 Konsistensi Aktivitas (3 Bulan Terakhir)
            </h4>
            
            <div className="heatmap-wrapper">
              <div className="heatmap-days-labels">
                <span>Minggu</span>
                <span>Senin</span>
                <span>Selasa</span>
                <span>Rabu</span>
                <span>Kamis</span>
                <span>Jumat</span>
                <span>Sabtu</span>
              </div>
              <div className="heatmap-scroll-container">
                <div className="heatmap-grid">
                  {heatmapCells.map((cell, idx) => {
                    const formattedDate = new Date(cell.dateStr).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    return (
                      <div 
                        key={idx}
                        className={`heatmap-cell level-${cell.level}`}
                        title={`${formattedDate}: ${cell.count} aktivitas selesai`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="heatmap-legend">
              <span className="legend-text">Kurang</span>
              <div className="heatmap-cell level-0"></div>
              <div className="heatmap-cell level-1"></div>
              <div className="heatmap-cell level-2"></div>
              <div className="heatmap-cell level-3"></div>
              <span className="legend-text">Aktif</span>
            </div>
          </div>

          {/* KARTU STATISTIK GRID */}
          <div className="dashboard-stats-grid">
            <div className="glass-card stat-card" onClick={() => setActiveTab('sejak')} style={{ cursor: 'pointer' }}>
              <span className="stat-value" style={{ color: 'var(--color-primary)' }}>{activeCountersCount}</span>
              <span className="stat-label">Sejak</span>
            </div>

            <div className="glass-card stat-card" onClick={() => setActiveTab('terakhir')} style={{ cursor: 'pointer' }}>
              <span className="stat-value" style={{ color: 'var(--color-secondary)' }}>{activitiesCount}</span>
              <span className="stat-label">Terakhir</span>
            </div>

            <div className="glass-card stat-card" onClick={() => setActiveTab('masa-depan')} style={{ cursor: 'pointer' }}>
              <span className="stat-value" style={{ color: 'var(--color-accent)' }}>{futureGoalsCount}</span>
              <span className="stat-label">Target</span>
            </div>
          </div>

          {/* PANEL SOROTAN (SPOTLIGHT) */}
          <div className="spotlight-section">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} /> Perlu Perhatian Anda
            </h3>

            {/* Spotlight Aktivitas Terlama */}
            {spotlightActivity ? (
              (() => {
                const daysSince = getDaysSince(spotlightActivity.last_done_date || '');
                const categoryObj = categories.find(c => c.id === spotlightActivity.category_id);
                return (
                  <div className="glass-card spotlight-card">
                    <div className="spotlight-icon-wrapper">
                      {spotlightActivity.emoji}
                    </div>
                    <div className="spotlight-info">
                      <PrivacyWrapper isPrivate={spotlightActivity.is_private} className="spotlight-title">
                        {spotlightActivity.title}
                      </PrivacyWrapper>
                      <span className="spotlight-desc">
                        {daysSince === 0 ? 'Sudah diselesaikan hari ini.' : 'Sudah cukup lama sejak terakhir kali. Ingin melakukannya hari ini?'}
                      </span>
                      {categoryObj && (
                        <span className="category-badge">
                          <span className="category-badge-dot" style={{ backgroundColor: categoryObj.color }}></span>
                          {categoryObj.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="spotlight-metric">
                        <PrivacyWrapper isPrivate={spotlightActivity.is_private}>
                          {daysSince}
                        </PrivacyWrapper>
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', textAlign: 'right' }}>Hari</span>
                      </div>
                      <button 
                        onClick={() => handleQuickReset(spotlightActivity.id)}
                        className={`reset-btn ${resettingId === spotlightActivity.id ? 'spin-animation' : ''}`}
                        title="Tandai diselesaikan hari ini"
                        disabled={resettingId === spotlightActivity.id}
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Semua aktivitas beres! Tidak ada aktivitas rutin yang tertunda.
              </div>
            )}

            {/* Spotlight Target Terdekat */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--color-accent)' }} /> Arah Masa Depan
            </h3>

            {spotlightGoal ? (
              (() => {
                const daysRemaining = getDaysRemaining(spotlightGoal.target_date);
                const categoryObj = categories.find(c => c.id === spotlightGoal.category_id);
                return (
                  <div className="glass-card spotlight-card future">
                    <div className="spotlight-icon-wrapper" style={{ borderColor: 'var(--color-secondary)' }}>
                      🎯
                    </div>
                    <div className="spotlight-info">
                      <PrivacyWrapper isPrivate={spotlightGoal.is_private} className="spotlight-title">
                        {spotlightGoal.title}
                      </PrivacyWrapper>
                      <span className="spotlight-desc">
                        Target: <PrivacyWrapper isPrivate={spotlightGoal.is_private}>
                          {new Date(spotlightGoal.target_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </PrivacyWrapper>
                      </span>
                      {categoryObj && (
                        <span className="category-badge">
                          <span className="category-badge-dot" style={{ backgroundColor: categoryObj.color }}></span>
                          {categoryObj.name}
                        </span>
                      )}
                    </div>
                    <div className="spotlight-metric future">
                      <PrivacyWrapper isPrivate={spotlightGoal.is_private}>
                        {daysRemaining > 0 ? (
                          <>
                            {daysRemaining} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Hari lagi</span>
                          </>
                        ) : daysRemaining === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>Hari ini!</span>
                        ) : (
                          <>
                            Terlewat {Math.abs(daysRemaining)} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Hari</span>
                          </>
                        )}
                      </PrivacyWrapper>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Belum ada rencana atau target terdekat.
              </div>
            )}
          </div>
        </>
      )}
    </div>

    {/* MODAL MILESTONE REFLECTION */}
    {activeMilestone && (
      <div className="modal-overlay" style={{ zIndex: 180 }} onClick={() => {
        // Klik luar ditutup biasa
        if (!reflectionSaved && !savingReflection) {
          onUpdateMilestone(activeMilestone.counter.id, activeMilestone.elapsed);
          setActiveMilestone(null);
        }
      }}>
        <div className="modal-sheet animate-slide-up" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
              ✨ Perayaan Milestone!
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px', textAlign: 'center' }}>
            <div 
              style={{ 
                fontSize: '3.5rem', 
                margin: '8px 0',
                animation: 'spin 1s ease-out'
              }}
            >
              {activeMilestone.counter.emoji}
            </div>

            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-primary)' }}>
              Hari ini genap {activeMilestone.elapsed} hari sejak "{activeMilestone.counter.title}"!
            </h4>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Luangkan waktu sebentar, apa satu hal terbaik yang kamu pelajari sejauh ini?
            </p>

            {reflectionSaved ? (
              <div 
                className="animate-fade-in"
                style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid var(--color-success)', 
                  color: 'var(--color-success)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  margin: '12px 0'
                }}
              >
                🎉 Refleksi kamu berhasil dicatat! Teruslah bertumbuh.
              </div>
            ) : showReflectionInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                <textarea
                  className="glass-input"
                  rows={4}
                  placeholder="Tulis refleksi atau pelajaran berharga Anda di sini..."
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  style={{ resize: 'none', fontSize: '0.88rem' }}
                  maxLength={200}
                  autoFocus
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {reflectionText.length}/200 karakter
                </span>
              </div>
            ) : null}

            {!reflectionSaved && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                {!showReflectionInput ? (
                  <>
                    <button 
                      onClick={async () => {
                        setSavingReflection(true);
                        await onUpdateMilestone(activeMilestone.counter.id, activeMilestone.elapsed);
                        setSavingReflection(false);
                        setActiveMilestone(null);
                      }} 
                      className="btn-secondary" 
                      style={{ flex: 1 }}
                      disabled={savingReflection}
                    >
                      Tutup
                    </button>
                    <button 
                      onClick={() => setShowReflectionInput(true)} 
                      className="btn-primary" 
                      style={{ flex: 1 }}
                    >
                      Catat Jurnal
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setShowReflectionInput(false);
                        setReflectionText('');
                      }} 
                      className="btn-secondary" 
                      style={{ flex: 1 }}
                    >
                      Batal
                    </button>
                    <button 
                      onClick={async () => {
                        if (!reflectionText.trim()) return;
                        setSavingReflection(true);
                        await onUpdateMilestone(activeMilestone.counter.id, activeMilestone.elapsed);
                        
                        // Simpan ke catatan local
                        const localJournal = localStorage.getItem('since_reflections') || '[]';
                        const list = JSON.parse(localJournal);
                        list.push({
                          id: crypto.randomUUID(),
                          counter_id: activeMilestone.counter.id,
                          counter_title: activeMilestone.counter.title,
                          milestone: activeMilestone.elapsed,
                          reflection: reflectionText.trim(),
                          created_at: new Date().toISOString()
                        });
                        localStorage.setItem('since_reflections', JSON.stringify(list));

                        setReflectionSaved(true);
                        setSavingReflection(false);

                        setTimeout(() => {
                          setReflectionSaved(false);
                          setShowReflectionInput(false);
                          setReflectionText('');
                          setActiveMilestone(null);
                        }, 2200);
                      }} 
                      className="btn-primary" 
                      style={{ flex: 1 }}
                      disabled={savingReflection || !reflectionText.trim()}
                    >
                      {savingReflection ? (
                        <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                      ) : (
                        'Simpan'
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};
export default Dashboard;
