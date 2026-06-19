import React, { useState } from 'react';
import type { Category } from '../lib/db';
import { Plus, X, Trash2, Pencil, Tag } from 'lucide-react';

interface KategoriTabProps {
  categories: Category[];
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, color: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  loading: boolean;
}

const PRESET_COLORS = [
  { name: 'Electric Blue', value: 'hsl(225, 100%, 65%)' },
  { name: 'Purple Accent', value: 'hsl(260, 100%, 65%)' },
  { name: 'Teal Cyan', value: 'hsl(187, 92%, 45%)' },
  { name: 'Emerald Green', value: 'hsl(142, 70%, 45%)' },
  { name: 'Amber Orange', value: 'hsl(35, 95%, 55%)' },
  { name: 'Rose Pink', value: 'hsl(340, 85%, 60%)' },
  { name: 'Indigo Violet', value: 'hsl(280, 85%, 60%)' },
  { name: 'Slate Gray', value: 'hsl(215, 20%, 60%)' },
];

export const KategoriTab: React.FC<KategoriTabProps> = ({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  loading
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value);
  const [formLoading, setFormLoading] = useState(false);

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSelectedColor(category.color);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setName('');
    setSelectedColor(PRESET_COLORS[0].value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setFormLoading(true);
    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, name.trim(), selectedColor);
      } else {
        await onCreateCategory(name.trim(), selectedColor);
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="tab-content animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Kategori Aspek Hidup</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Kelola kategori untuk mengelompokkan momen, kebiasaan, dan rencana hidup Anda.
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

      {loading && categories.length === 0 ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '24px' }}>
          <p style={{ marginBottom: '16px' }}>Belum ada kategori yang ditambahkan.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Tambah Kategori
          </button>
        </div>
      ) : (
        <div className="list-container" style={{ marginTop: '24px' }}>
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="glass-card list-item-card animate-slide-up"
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid var(--border-glass)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cat.color
                  }}
                >
                  <Tag size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: cat.color 
                      }} 
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Preset warna
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* TOMBOL EDIT */}
                <button 
                  onClick={() => handleStartEdit(cat)}
                  className="btn-icon" 
                  title="Edit Kategori"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Pencil size={16} />
                </button>

                {/* TOMBOL HAPUS */}
                <button 
                  onClick={() => {
                    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"? Momen & target terkait akan dialihkan ke status "Tanpa Kategori".`)) {
                      onDeleteCategory(cat.id);
                    }
                  }}
                  className="btn-icon" 
                  title="Hapus Kategori"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* MODAL BOTTOM SHEET */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
              <button onClick={handleCloseModal} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Nama Kategori
                </label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Contoh: Finansial, Hobi, Karir..." 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>
                  Pilih Warna Representatif
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '12px',
                        background: selectedColor === color.value ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                        border: selectedColor === color.value ? `1px solid ${color.value}` : '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <span 
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          backgroundColor: color.value,
                          boxShadow: selectedColor === color.value ? `0 0 10px ${color.value}` : 'none'
                        }} 
                      />
                      <span style={{ fontSize: '0.65rem', color: selectedColor === color.value ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={formLoading || !name.trim()}
                >
                  {formLoading ? (
                    <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
