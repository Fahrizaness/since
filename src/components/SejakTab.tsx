import React, { useState } from 'react';
import type { Counter, Category } from '../lib/db';
import { PrivacyWrapper } from './PrivacyWrapper';
import { Plus, X, Trash2, Calendar, Pencil } from 'lucide-react';
import { toLocalDateString, parseLocalDate } from '../lib/db';

interface SejakTabProps {
  categories: Category[];
  counters: Counter[];
  onCreateCounter: (title: string, startDate: string, emoji: string, categoryId: string | null, isPrivate: boolean) => Promise<void>;
  onUpdateCounter: (id: string, title: string, startDate: string, emoji: string, categoryId: string | null, isPrivate: boolean) => Promise<void>;
  onDeleteCounter: (id: string) => Promise<void>;
  loading: boolean;
  autoOpenAddModal?: boolean;
  onClearAutoOpen?: () => void;
}

const EMOJI_OPTIONS = ['🎓', '💼', '💍', '👶', '❤️', '✈️', '🏠', '🚗', '🏆', '🌟', '🍀', '💡', '🩹', '🐾'];

export const SejakTab: React.FC<SejakTabProps> = ({
  categories,
  counters,
  onCreateCounter,
  onUpdateCounter,
  onDeleteCounter,
  loading,
  autoOpenAddModal = false,
  onClearAutoOpen
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState<Counter | null>(null);

  React.useEffect(() => {
    if (autoOpenAddModal) {
      const timer = setTimeout(() => {
        setShowModal(true);
        if (onClearAutoOpen) onClearAutoOpen();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoOpenAddModal, onClearAutoOpen]);

  // Form states
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🌟');
  const [formLoading, setFormLoading] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Kalkulasi selisih hari & breakdown
  const calculateElapsed = (dateStr: string) => {
    const start = parseLocalDate(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    const totalTime = end.getTime() - start.getTime();
    const totalDays = Math.floor(totalTime / (1000 * 60 * 60 * 24));

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { totalDays, years, months, days };
  };

  const handleStartEdit = (counter: Counter) => {
    setEditingCounter(counter);
    setTitle(counter.title);
    setStartDate(counter.start_date);
    setFormCategoryId(counter.category_id || '');
    setIsPrivate(counter.is_private);
    setSelectedEmoji(counter.emoji);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCounter(null);
    setTitle('');
    setStartDate('');
    setFormCategoryId('');
    setIsPrivate(false);
    setSelectedEmoji('🌟');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate) return;

    setFormLoading(true);
    try {
      const catId = formCategoryId === '' ? null : formCategoryId;
      if (editingCounter) {
        // Edit Mode
        await onUpdateCounter(editingCounter.id, title, startDate, selectedEmoji, catId, isPrivate);
      } else {
        // Create Mode
        await onCreateCounter(title, startDate, selectedEmoji, catId, isPrivate);
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredCounters = selectedCategoryId
    ? counters.filter((c) => c.category_id === selectedCategoryId)
    : counters;

  return (
    <div className="tab-content animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Sejak Kapan</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Hitung berapa lama waktu berlalu dari momen penting hidup Anda.
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
            flexShrink: 0
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

      {loading && counters.length === 0 ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : filteredCounters.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '16px' }}>Tidak ada counter momen masa lalu.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Tambah Counter
          </button>
        </div>
      ) : (
        <div className="list-container">
          {filteredCounters.map((counter) => {
            const { totalDays, years, months, days } = calculateElapsed(counter.start_date);
            const dateFormatted = parseLocalDate(counter.start_date).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            const categoryObj = categories.find((c) => c.id === counter.category_id);

            return (
              <div key={counter.id} className="glass-card list-item-card animate-slide-up">
                <div className="item-emoji">{counter.emoji}</div>
                
                <div className="item-details">
                  <PrivacyWrapper isPrivate={counter.is_private} className="item-title">
                    {counter.title}
                  </PrivacyWrapper>
                  
                  <p className="item-subtext" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> 
                    <PrivacyWrapper isPrivate={counter.is_private}>
                      {dateFormatted}
                    </PrivacyWrapper>
                  </p>
                  
                  {/* Breakdown Tahun/Bulan/Hari */}
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <PrivacyWrapper isPrivate={counter.is_private}>
                      {years > 0 && `${years} tahun `}
                      {months > 0 && `${months} bulan `}
                      {days >= 0 && `${days} hari`}
                    </PrivacyWrapper>
                  </p>

                  {/* Kategori Badge */}
                  {categoryObj && (
                    <span className="category-badge">
                      <span className="category-badge-dot" style={{ backgroundColor: categoryObj.color }}></span>
                      {categoryObj.name}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="counter-value">
                    <PrivacyWrapper isPrivate={counter.is_private}>
                      {totalDays}
                    </PrivacyWrapper>
                    <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block' }}>Hari lalu</span>
                  </div>
                  
                  {/* TOMBOL EDIT */}
                  <button 
                    onClick={() => handleStartEdit(counter)}
                    className="btn-icon" 
                    title="Edit Momen"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil size={16} />
                  </button>

                  {/* TOMBOL HAPUS */}
                  <button 
                    onClick={() => onDeleteCounter(counter.id)}
                    className="btn-icon" 
                    title="Hapus"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
              <h3 className="modal-title">{editingCounter ? 'Edit Momen Penting' : 'Tambah Momen Baru'}</h3>
              <button onClick={handleCloseModal} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nama Momen / Kejadian</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Contoh: Lulus Kuliah, Pernikahan, Pindah Rumah" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Tanggal</label>
                  <input 
                    type="date" 
                    className="glass-input" 
                    max={toLocalDateString(new Date())}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required 
                  />
                </div>

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

              {/* PRIVACY MODE TOGGLE */}
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
                style={{ width: '100%', marginTop: '8px' }}
                disabled={formLoading}
              >
                {formLoading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                ) : editingCounter ? 'Simpan Perubahan' : 'Simpan Momen'}
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

export default SejakTab;
