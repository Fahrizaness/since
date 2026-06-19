import React, { useState } from 'react';
import { toLocalDateString, parseLocalDate } from '../lib/db';
import type { FutureGoal, Category } from '../lib/db';
import { PrivacyWrapper } from './PrivacyWrapper';
import { Plus, X, Trash2, Calendar, Check, Pencil, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { isAIConfigured, generateGoalActionPlan } from '../lib/ai';

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

  // States untuk Rencana Aksi AI
  const [aiPlans, setAiPlans] = useState<{[goalId: string]: string[]}>((() => {
    const saved = localStorage.getItem('since_ai_plans');
    return saved ? JSON.parse(saved) : {};
  }));
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);

  const handleGeneratePlan = async (goalId: string, goalTitle: string, goalTargetDate: string) => {
    setPlanLoadingId(goalId);
    try {
      const steps = await generateGoalActionPlan(goalTitle, goalTargetDate);
      const updated = { ...aiPlans, [goalId]: steps };
      setAiPlans(updated);
      localStorage.setItem('since_ai_plans', JSON.stringify(updated));
    } catch (err) {
      console.error('Gagal membuat rencana aksi AI:', err);
    } finally {
      setPlanLoadingId(null);
    }
  };

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
    const target = parseLocalDate(dateStr);
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
      const year = parseLocalDate(goal.target_date).getFullYear().toString();
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
                const dateFormatted = parseLocalDate(goal.target_date).toLocaleDateString('id-ID', {
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

                      {/* AREA RENCANA AKSI AI */}
                      {!goal.status && isAIConfigured() && (
                        <div style={{ marginTop: '8px' }}>
                          {planLoadingId === goal.id ? (
                            <div className="animate-pulse-slow" style={{ 
                              marginTop: '12px', 
                              padding: '12px', 
                              borderRadius: '10px', 
                              background: 'rgba(124, 77, 255, 0.05)',
                              border: '1px dashed rgba(124, 77, 255, 0.2)',
                              fontSize: '0.75rem',
                              color: 'var(--color-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: 'var(--color-secondary) transparent' }}></span>
                              <span>Menyusun rencana aksi AI...</span>
                            </div>
                          ) : aiPlans[goal.id] ? (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              borderRadius: '10px',
                              background: 'rgba(124, 77, 255, 0.04)',
                              border: '1px dashed rgba(124, 77, 255, 0.2)',
                              animation: 'slideUp var(--transition-fast) forwards'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '8px'
                              }}>
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  fontWeight: 700, 
                                  color: 'var(--color-secondary)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '4px' 
                                }}>
                                  <Sparkles size={12} style={{ filter: 'drop-shadow(0 0 2px var(--color-secondary))' }} /> Rencana Aksi AI
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleGeneratePlan(goal.id, goal.title, goal.target_date)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    textDecoration: 'underline'
                                  }}
                                >
                                  Regenerasi
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {aiPlans[goal.id].map((step, sIdx) => (
                                  <div key={sIdx} style={{ 
                                    display: 'flex', 
                                    gap: '8px', 
                                    fontSize: '0.78rem', 
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.3
                                  }}>
                                    <span style={{ 
                                      color: 'var(--color-secondary)', 
                                      fontWeight: 700 
                                    }}>{sIdx + 1}.</span>
                                    <span>
                                      <PrivacyWrapper isPrivate={goal.is_private}>
                                        {step}
                                      </PrivacyWrapper>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGeneratePlan(goal.id, goal.title, goal.target_date)}
                              className="btn-secondary"
                              style={{
                                fontSize: '0.72rem',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px',
                                border: '1px solid rgba(124, 77, 255, 0.3)',
                                color: 'var(--color-secondary)',
                                background: 'rgba(124, 77, 255, 0.05)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)'
                              }}
                            >
                              <Sparkles size={10} style={{ color: 'var(--color-secondary)' }} />
                              Rencana Aksi AI
                            </button>
                          )}
                        </div>
                      )}
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
                    min={editingGoal ? undefined : toLocalDateString(new Date())}
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
