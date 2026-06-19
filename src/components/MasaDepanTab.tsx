import React, { useState } from 'react';
import type { FutureGoal, Category } from '../lib/db';
import { PrivacyWrapper } from './PrivacyWrapper';
import { Plus, X, Trash2, Calendar, Check, Pencil } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MasaDepanTabProps {
  categories: Category[];
  goals: FutureGoal[];
  onCreateGoal: (title: string, targetDate: string, categoryId: string | null, isPrivate: boolean) => Promise<void>;
  onUpdateGoal: (id: string, title: string, targetDate: string, categoryId: string | null, isPrivate: boolean) => Promise<void>;
  onToggleGoalStatus: (id: string, currentStatus: boolean) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  loading: boolean;
}

export const MasaDepanTab: React.FC<MasaDepanTabProps> = ({
  categories,
  goals,
  onCreateGoal,
  onUpdateGoal,
  onToggleGoalStatus,
  onDeleteGoal,
  loading
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FutureGoal | null>(null);
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const handleStartEdit = (goal: FutureGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetDate(goal.target_date);
    setFormCategoryId(goal.category_id || '');
    setIsPrivate(goal.is_private);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setTitle('');
    setTargetDate('');
    setFormCategoryId('');
    setIsPrivate(false);
  };

  // Kalkulasi sisa hari
  const getDaysRemaining = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCheckboxClick = async (id: string, currentStatus: boolean) => {
    if (!currentStatus) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.75 },
        colors: ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ffffff']
      });
    }
    
    try {
      await onToggleGoalStatus(id, currentStatus);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetDate) return;

    setFormLoading(true);
    try {
      const catId = formCategoryId === '' ? null : formCategoryId;
      if (editingGoal) {
        await onUpdateGoal(editingGoal.id, title, targetDate, catId, isPrivate);
      } else {
        await onCreateGoal(title, targetDate, catId, isPrivate);
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  // Filter goals berdasarkan kategori terpilih
  const filteredGoals = selectedCategoryId
    ? goals.filter((g) => g.category_id === selectedCategoryId)
    : goals;

  // Mengelompokkan target berdasarkan tahun pencapaian
  const getGroupedGoals = () => {
    const groups: { [year: string]: FutureGoal[] } = {};
    filteredGoals.forEach((goal) => {
      const year = new Date(goal.target_date).getFullYear().toString();
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(goal);
    });
    return groups;
  };

  const groupedGoals = getGroupedGoals();
  const sortedYears = Object.keys(groupedGoals).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="tab-content animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Masa Depan</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Petakan target hidup Anda secara kronologis dalam linimasa.
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
            background: 'linear-gradient(135deg, var(--color-accent) 0%, hsl(20, 92%, 50%) 100%)', 
            boxShadow: '0 4px 12px var(--color-accent-glow)'
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

      {loading && goals.length === 0 ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '16px' }}>Tidak ada rencana masa depan.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Rencanakan Target
          </button>
        </div>
      ) : (
        <div className="timeline-container animate-slide-up">
          <div className="timeline-line"></div>

          {sortedYears.map((year) => (
            <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div 
                style={{ 
                  fontSize: '1.15rem', 
                  fontWeight: 800, 
                  color: 'var(--color-accent)', 
                  margin: '8px 0 0 -8px', 
                  fontFamily: 'var(--font-heading)',
                  zIndex: 10,
                  background: 'var(--bg-app)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  alignSelf: 'flex-start',
                  border: '1px solid var(--border-glass)'
                }}
              >
                Tahun {year}
              </div>

              {groupedGoals[year].map((goal) => {
                const daysRemaining = getDaysRemaining(goal.target_date);
                const categoryObj = categories.find((c) => c.id === goal.category_id);
                const dateFormatted = new Date(goal.target_date).toLocaleDateString('id-ID', {
                  month: 'long',
                  day: 'numeric'
                });

                return (
                  <div key={goal.id} className={`timeline-item ${goal.status ? 'achieved' : ''}`}>
                    <div className="timeline-node"></div>
                    
                    <div className={`glass-card timeline-card ${goal.status ? 'achieved' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        
                        {/* CHECKBOX */}
                        <div 
                          onClick={() => handleCheckboxClick(goal.id, goal.status)}
                          className={`timeline-checkbox ${goal.status ? 'checked' : ''}`}
                          title={goal.status ? "Tandai Belum Tercapai" : "Tandai Tercapai"}
                        >
                          <Check size={14} strokeWidth={3} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 
                            className="item-title" 
                            style={{ 
                              textDecoration: goal.status ? 'line-through' : 'none',
                              color: goal.status ? 'var(--text-muted)' : 'var(--text-primary)'
                            }}
                          >
                            <PrivacyWrapper isPrivate={goal.is_private}>
                              {goal.title}
                            </PrivacyWrapper>
                          </h4>
                          
                          <p className="item-subtext" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> 
                            <PrivacyWrapper isPrivate={goal.is_private}>
                              {dateFormatted}, {year}
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

                        {/* HITUNG MUNDUR SISA HARI */}
                        {!goal.status && (
                          <div 
                            style={{ 
                              fontSize: '0.78rem', 
                              fontWeight: 700, 
                              color: daysRemaining > 0 ? 'var(--color-secondary)' : daysRemaining === 0 ? 'var(--color-accent)' : 'var(--color-danger)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <PrivacyWrapper isPrivate={goal.is_private}>
                              {daysRemaining > 0 ? (
                                `${daysRemaining} hari lagi`
                              ) : daysRemaining === 0 ? (
                                'Hari ini!'
                              ) : (
                                `Terlewat ${Math.abs(daysRemaining)} hari`
                              )}
                            </PrivacyWrapper>
                          </div>
                        )}

                        {goal.status && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                            Tercapai! 🎉
                          </div>
                        )}

                        {/* EDIT TARGET */}
                        <button 
                          onClick={() => handleStartEdit(goal)}
                          className="btn-icon" 
                          title="Edit"
                          style={{ color: 'var(--text-muted)', marginLeft: '4px', padding: '4px' }}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* HAPUS TARGET */}
                        <button 
                          onClick={() => onDeleteGoal(goal.id)}
                          className="btn-icon" 
                          title="Hapus"
                          style={{ color: 'var(--text-muted)', marginLeft: '4px', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}


      {/* MODAL BOTTOM SHEET */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingGoal ? 'Edit Rencana Target' : 'Rencanakan Target Baru'}</h3>
              <button onClick={handleCloseModal} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Rencana / Impian Anda</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Contoh: Lulus Kuliah S2, Menikah, Punya Bisnis" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Tanggal Target Pencapaian</label>
                  <input 
                    type="date" 
                    className="glass-input" 
                    min={editingGoal ? undefined : new Date().toISOString().split('T')[0]}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
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

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  width: '100%', 
                  marginTop: '8px',
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, hsl(20, 92%, 50%) 100%)', 
                  boxShadow: '0 4px 12px var(--color-accent-glow)'
                }}
                disabled={formLoading}
              >
                {formLoading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                ) : editingGoal ? 'Simpan Perubahan' : 'Simpan Rencana'}
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

export default MasaDepanTab;
