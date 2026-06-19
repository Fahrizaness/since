import React, { useState, useEffect } from 'react';
import { dbActivities } from '../lib/db';
import type { Activity, Category, ActivityLog } from '../lib/db';
import { PrivacyWrapper } from './PrivacyWrapper';
import { Plus, X, Trash2, RefreshCw, Calendar, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { toLocalDateString, parseLocalDate } from '../lib/db';

interface TerakhirTabProps {
  categories: Category[];
  activities: Activity[];
  onCreateActivity: (title: string, lastDoneDate: string, emoji: string, categoryId: string | null, isPrivate: boolean) => Promise<void>;
  onUpdateActivity: (id: string, title: string, emoji: string, categoryId: string | null, isPrivate: boolean) => Promise<void>;
  onResetActivity: (id: string) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  loading: boolean;
  onDeleteActivityLog: (logId: string) => Promise<void>;
}

const EMOJI_OPTIONS = ['📞', '🏋️', '🪴', '🧼', '🧹', '💇', '🚗', '🦷', '🧺', '🐾', '🛒', '🩺', '🧉', '💻'];

export const TerakhirTab: React.FC<TerakhirTabProps> = ({
  categories,
  activities,
  onCreateActivity,
  onUpdateActivity,
  onResetActivity,
  onDeleteActivity,
  loading,
  onDeleteActivityLog
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [title, setTitle] = useState('');
  const [lastDoneDate, setLastDoneDate] = useState(toLocalDateString(new Date()));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📞');
  const [formLoading, setFormLoading] = useState(false);
  
  // State reset animation & expanded card
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const handleDeleteLog = async (logId: string, activityId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus log riwayat penyelesaian ini?')) {
      setLogsLoading(true);
      try {
        await onDeleteActivityLog(logId);
        // Refresh log riwayat setelah penghapusan
        const freshLogs = await dbActivities.getLogs(activityId);
        setActivityLogs(freshLogs);
      } catch (err) {
        console.error(err);
      } finally {
        setLogsLoading(false);
      }
    }
  };

  // Ambil log riwayat saat kartu dilebarkan (expanded)
  useEffect(() => {
    let active = true;
    if (expandedActivityId) {
      const timer = setTimeout(() => {
        setLogsLoading(true);
        dbActivities.getLogs(expandedActivityId)
          .then((data) => {
            if (active) {
              setActivityLogs(data);
              setLogsLoading(false);
            }
          })
          .catch((err) => {
            console.error(err);
            if (active) {
              setLogsLoading(false);
            }
          });
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      const timer = setTimeout(() => {
        setActivityLogs([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [expandedActivityId]);

  // Nada pengingat ramah (Bahasa Merangkul)
  const getFriendlyStatus = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDone = parseLocalDate(dateStr);
    lastDone.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - lastDone.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Masa depan';
    if (diffDays === 0) return 'Diselesaikan hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays >= 30) {
      return `Sudah cukup lama sejak terakhir kali (${diffDays} hari lalu). Ingin melakukannya hari ini?`;
    }
    return `${diffDays} hari yang lalu`;
  };

  const handleReset = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Mencegah kartu melebar saat mengklik tombol reset
    setResettingId(id);
    try {
      await onResetActivity(id);
      // Jika kartu ini sedang dilebarkan, refresh log riwayatnya
      if (expandedActivityId === id) {
        const freshLogs = await dbActivities.getLogs(id);
        setActivityLogs(freshLogs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setResettingId(null);
      }, 500);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, activity: Activity) => {
    e.stopPropagation(); // Mencegah kartu melebar saat mengklik edit
    setEditingActivity(activity);
    setTitle(activity.title);
    setFormCategoryId(activity.category_id || '');
    setIsPrivate(activity.is_private);
    setSelectedEmoji(activity.emoji);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingActivity(null);
    setTitle('');
    setLastDoneDate(toLocalDateString(new Date()));
    setFormCategoryId('');
    setIsPrivate(false);
    setSelectedEmoji('📞');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Mencegah kartu melebar saat menghapus
    try {
      await onDeleteActivity(id);
      if (expandedActivityId === id) {
        setExpandedActivityId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!editingActivity && !lastDoneDate)) return;

    setFormLoading(true);
    try {
      const catId = formCategoryId === '' ? null : formCategoryId;
      if (editingActivity) {
        await onUpdateActivity(editingActivity.id, title, selectedEmoji, catId, isPrivate);
      } else {
        await onCreateActivity(title, lastDoneDate, selectedEmoji, catId, isPrivate);
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredActivities = selectedCategoryId
    ? activities.filter((a) => a.category_id === selectedCategoryId)
    : activities;

  return (
    <div className="tab-content animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Terakhir Kali</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Catat kapan terakhir kali Anda melakukan kebiasaan penting yang tidak berjadwal tetap.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="btn-primary" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '10px 16px', 
            borderRadius: '12px', 
            fontSize: '0.88rem', 
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-secondary) 0%, hsl(200, 92%, 45%) 100%)', 
            boxShadow: '0 4px 12px var(--color-secondary-glow)'
          }}
        >
          <Plus size={16} />
          <span>Tambah</span>
        </button>
      </div>

      {/* FILTER BAR KATEGORI */}
      {categories.length > 0 && (
        <div className="category-filter-bar">
          <button 
            className={`filter-pill ${selectedCategoryId === null ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId(null)}
          >
            Semua
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

      {loading && activities.length === 0 ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '16px' }}>Tidak ada pelacakan aktivitas rutin.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Tambah Aktivitas
          </button>
        </div>
      ) : (
        <div className="list-container">
          {filteredActivities.map((activity) => {
            const isExpanded = expandedActivityId === activity.id;
            const relativeTimeStr = getFriendlyStatus(activity.last_done_date || '');
            const categoryObj = categories.find((c) => c.id === activity.category_id);
            const dateFormatted = parseLocalDate(activity.last_done_date || '').toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div 
                key={activity.id} 
                className={`glass-card list-item-card animate-slide-up ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedActivityId(isExpanded ? null : activity.id)}
              >
                <div className="list-item-main-row">
                  <div className="item-emoji">{activity.emoji}</div>
                  
                  <div className="item-details">
                    <PrivacyWrapper isPrivate={activity.is_private} className="item-title">
                      {activity.title}
                    </PrivacyWrapper>
                    
                    <PrivacyWrapper isPrivate={activity.is_private} className="item-subtext" style={{ color: 'var(--color-secondary)', fontWeight: 500 }}>
                      {relativeTimeStr}
                    </PrivacyWrapper>
                    
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Tanggal: <PrivacyWrapper isPrivate={activity.is_private}>{dateFormatted}</PrivacyWrapper>
                    </p>

                    {/* Kategori Badge */}
                    {categoryObj && (
                      <span className="category-badge">
                        <span className="category-badge-dot" style={{ backgroundColor: categoryObj.color }}></span>
                        {categoryObj.name}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* TOMBOL QUICK RESET */}
                    <button 
                      onClick={(e) => handleReset(e, activity.id)}
                      className={`reset-btn ${resettingId === activity.id ? 'spin-animation' : ''}`}
                      title="Reset waktu menjadi Hari Ini"
                      disabled={resettingId !== null}
                    >
                      <RefreshCw size={16} />
                    </button>

                    {/* EDIT */}
                    <button 
                      onClick={(e) => handleStartEdit(e, activity)}
                      className="btn-icon" 
                      title="Edit"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil size={16} />
                    </button>

                    {/* HAPUS */}
                    <button 
                      onClick={(e) => handleDelete(e, activity.id)}
                      className="btn-icon" 
                      title="Hapus"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={16} />
                    </button>

                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {/* AREA RIWAYAT LOG EKSPANSI (1-TO-MANY HISTORY LOG) */}
                {isExpanded && (
                  <div className="history-log-section" onClick={(e) => e.stopPropagation()}>
                    <span className="history-log-title">Jejak Riwayat</span>
                    
                    {logsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      </div>
                    ) : activityLogs.length <= 1 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '4px' }}>
                        Belum ada jejak riwayat reset lainnya. Log dimulai sejak ditambahkan.
                      </div>
                    ) : (
                      <div className="history-log-list">
                        {activityLogs.map((log) => {
                          const logDateStr = new Date(log.done_at).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                          const logTimeStr = new Date(log.done_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <div key={log.id} className="history-log-item">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Calendar size={12} />
                                  <PrivacyWrapper isPrivate={activity.is_private}>
                                    {logDateStr}
                                  </PrivacyWrapper>
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>|</span>
                                <PrivacyWrapper isPrivate={activity.is_private}>
                                  {logTimeStr} WIB
                                </PrivacyWrapper>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLog(log.id, activity.id);
                                }}
                                className="btn-icon"
                                title="Hapus log"
                                style={{ 
                                  color: 'var(--color-danger)', 
                                  padding: '2px', 
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      {/* MODAL BOTTOM SHEET */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingActivity ? 'Edit Aktivitas Rutin' : 'Tambah Aktivitas Rutin'}</h3>
              <button onClick={handleCloseModal} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Aktivitas</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Contoh: Telepon Ibu, Siram Tanaman, Potong Rambut" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className={editingActivity ? "form-group" : "form-row-2col"}>
                {!editingActivity && (
                  <div className="form-group">
                    <label className="form-label">Terakhir Kali Dilakukan</label>
                    <input 
                      type="date" 
                      className="glass-input" 
                      max={toLocalDateString(new Date())}
                      value={lastDoneDate}
                      onChange={(e) => setLastDoneDate(e.target.value)}
                      required 
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Aspek Hidup (Kategori)</label>
                  <select 
                    className="glass-select"
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                  >
                    <option value="">Pilih Kategori (Opsional)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PRIVACY TOGGLE */}
              <div className="form-group" style={{ margin: '4px 0' }}>
                <label 
                  className="glass-checkbox-container"
                  onClick={() => setIsPrivate(!isPrivate)}
                >
                  <div className={`glass-checkbox ${isPrivate ? 'checked' : ''}`}>
                    <CheckIcon />
                  </div>
                  <span>Sembunyikan data ini (Gunakan Sensor Blur)</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Pilih Emoji Ikon</label>
                <div className="emoji-selector">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-option ${selectedEmoji === emoji ? 'selected' : ''}`}
                      onClick={() => setSelectedEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  width: '100%', 
                  marginTop: '8px',
                  background: 'linear-gradient(135deg, var(--color-secondary) 0%, hsl(200, 92%, 45%) 100%)', 
                  boxShadow: '0 4px 12px var(--color-secondary-glow)'
                }}
                disabled={formLoading}
              >
                {formLoading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                ) : editingActivity ? 'Simpan Perubahan' : 'Simpan Aktivitas'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper CheckIcon
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default TerakhirTab;
