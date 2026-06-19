import React, { useState, useEffect } from 'react';
import { X, Sun, Moon, User, Check, LogOut, Lock, Monitor } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onUpdateUsername: (newUsername: string) => Promise<void>;
  theme: 'dark' | 'light' | 'system';
  onChangeTheme: (theme: 'dark' | 'light' | 'system') => void;
  hasPin: boolean;
  onUpdatePin: (newPin: string) => Promise<void>;
  onSignOut: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  username,
  onUpdateUsername,
  theme,
  onChangeTheme,
  hasPin,
  onUpdatePin,
  onSignOut
}) => {
  const [tempUsername, setTempUsername] = useState(username);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;

    setPinLoading(true);
    setPinSuccess(false);
    try {
      await onUpdatePin(pin);
      setPinSuccess(true);
      setPin('');
      setTimeout(() => setPinSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setPinLoading(false);
    }
  };

  // Sync temp username when the username prop changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setTempUsername(username);
    }, 0);
    return () => clearTimeout(timer);
  }, [username]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUsername.trim()) return;

    setLoading(true);
    setSuccess(false);
    try {
      await onUpdateUsername(tempUsername.trim());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Pengaturan Aplikasi</h3>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* 1. EDIT USERNAME */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Nama Panggilan / Username</label>
            <div style={{ position: 'relative' }}>
              <User 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Masukkan nama panggilan Anda" 
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ 
              width: '100%', 
              background: success 
                ? 'linear-gradient(135deg, var(--color-success) 0%, hsl(142, 60%, 40%) 100%)' 
                : 'linear-gradient(135deg, var(--color-primary) 0%, hsl(270, 89%, 60%) 100%)',
              boxShadow: success ? '0 4px 12px var(--color-success-glow)' : '0 4px 12px var(--color-primary-glow)'
            }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
            ) : success ? (
              <>
                <Check size={18} /> Berhasil Disimpan
              </>
            ) : 'Simpan Nama'}
          </button>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '8px 0' }} />

        {/* 1.5. PIN KEAMANAN */}
        <form onSubmit={handleSavePin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>PIN Keamanan (6 Digit Angka)</span>
              {hasPin && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  PIN Aktif 🔐
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input 
                type="password" 
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                className="glass-input" 
                placeholder={hasPin ? "•••••• (Masukkan PIN baru untuk mengubah)" : "Masukkan 6 digit PIN cepat"} 
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                style={{ paddingLeft: '44px' }}
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ 
              width: '100%', 
              background: pinSuccess 
                ? 'linear-gradient(135deg, var(--color-success) 0%, hsl(142, 60%, 40%) 100%)' 
                : 'linear-gradient(135deg, var(--color-accent) 0%, hsl(20, 92%, 50%) 100%)',
              boxShadow: pinSuccess ? '0 4px 12px var(--color-success-glow)' : '0 4px 12px var(--color-accent-glow)'
            }}
            disabled={pinLoading || pin.length !== 6}
          >
            {pinLoading ? (
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
            ) : pinSuccess ? (
              <>
                <Check size={18} /> PIN Berhasil Disimpan
              </>
            ) : hasPin ? 'Ubah PIN Keamanan' : 'Aktifkan PIN Keamanan'}
          </button>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '8px 0' }} />

        {/* 2. MODE GELAP / TERANG / SISTEM */}
        <div className="form-group">
          <label className="form-label">Tema Aplikasi</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className={`btn-secondary ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onChangeTheme('light')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 4px',
                fontSize: '0.78rem',
                borderColor: theme === 'light' ? 'var(--color-primary)' : 'var(--border-glass)',
                background: theme === 'light' ? 'var(--color-primary-glow)' : 'var(--bg-card)',
                color: theme === 'light' ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderRadius: '10px'
              }}
            >
              <Sun size={16} />
              <span>Terang</span>
            </button>

            <button
              type="button"
              className={`btn-secondary ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onChangeTheme('dark')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 4px',
                fontSize: '0.78rem',
                borderColor: theme === 'dark' ? 'var(--color-primary)' : 'var(--border-glass)',
                background: theme === 'dark' ? 'var(--color-primary-glow)' : 'var(--bg-card)',
                color: theme === 'dark' ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderRadius: '10px'
              }}
            >
              <Moon size={16} />
              <span>Gelap</span>
            </button>

            <button
              type="button"
              className={`btn-secondary ${theme === 'system' ? 'active' : ''}`}
              onClick={() => onChangeTheme('system')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 4px',
                fontSize: '0.78rem',
                borderColor: theme === 'system' ? 'var(--color-primary)' : 'var(--border-glass)',
                background: theme === 'system' ? 'var(--color-primary-glow)' : 'var(--bg-card)',
                color: theme === 'system' ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderRadius: '10px'
              }}
            >
              <Monitor size={16} />
              <span>Sistem</span>
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '12px 0 4px' }} />

        {/* 3. TOMBOL LOGOUT */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="btn-secondary"
          style={{
            width: '100%',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            background: 'hsla(350, 45%, 65%, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: '12px',
            marginTop: '4px'
          }}
        >
          <LogOut size={18} />
          <span>Keluar dari Akun</span>
        </button>
      </div>
    </div>
  );
};
export default SettingsModal;
