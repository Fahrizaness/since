import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, ShieldAlert } from 'lucide-react';
import { Logo } from './Logo';
import type { Session } from '@supabase/supabase-js';

interface AuthProps {
  onAuthSuccess: (session: Session) => void;
  resolvedTheme: 'dark' | 'light';
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, resolvedTheme }) => {
  const [activeTab, setActiveTab] = useState<'magic-link' | 'pin'>('magic-link');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!supabase) {
      setErrorMsg("Klien Supabase tidak terdeteksi.");
      return;
    }

    if (!email) {
      setErrorMsg("Email harus diisi.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });
      if (error) throw error;
      setSuccessMsg("Tautan verifikasi (Magic Link) telah dikirim! Silakan periksa email Anda.");
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || "Gagal mengirim Magic Link.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!supabase) {
      setErrorMsg("Klien Supabase tidak terdeteksi.");
      return;
    }

    if (!email || !pin) {
      setErrorMsg("Email dan PIN harus diisi.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });
      if (error) throw error;
      if (data.session) {
        onAuthSuccess(data.session);
      }
    } catch {
      setErrorMsg("Gagal masuk. Pastikan email dan PIN Anda sudah benar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="auth-container" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        padding: '24px', 
        maxWidth: '420px', 
        margin: '0 auto', 
        gap: '24px',
        backgroundColor: 'var(--bg-app)',
        backgroundImage: resolvedTheme === 'light' 
          ? 'radial-gradient(circle at 50% 25%, rgba(79, 124, 255, 0.04) 0%, transparent 60%)'
          : 'radial-gradient(circle at 50% 25%, rgba(79, 124, 255, 0.12) 0%, transparent 60%)',
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* HEADER LOGO */}
      <div className="auth-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
        
        {/* LOGO RESMI: SVG Gradient Logo */}
        <div style={{ marginBottom: '16px' }}>
          <Logo size={64} />
        </div>

        <div 
          style={{
            fontSize: '2.5rem', 
            fontWeight: 800, 
            color: 'var(--text-primary)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-heading)'
          }}
        >
          Since
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '320px', margin: '4px auto 0 auto', textAlign: 'center', lineHeight: 1.4, fontStyle: 'italic' }}>
          "Karena setiap perjalanan memiliki awal."
        </p>
      </div>

      {/* CARD KOTAK MASUK */}
      <div 
        className="glass-card" 
        style={{
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* TABS MENU */}
        <div 
          className="auth-tabs" 
          style={{ 
            display: 'flex', 
            borderBottom: '1px solid var(--border-glass)', 
            marginBottom: '4px' 
          }}
        >
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'magic-link' ? 'active' : ''}`}
            onClick={() => { setActiveTab('magic-link'); setErrorMsg(null); setSuccessMsg(null); }}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              color: activeTab === 'magic-link' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: activeTab === 'magic-link' ? 600 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'center',
              position: 'relative',
              transition: 'color var(--transition-fast)'
            }}
          >
            Magic Link
            {activeTab === 'magic-link' && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'var(--color-primary)',
                  boxShadow: '0 0 10px var(--color-primary-glow)'
                }}
              />
            )}
          </button>
          
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'pin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('pin'); setErrorMsg(null); setSuccessMsg(null); }}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              color: activeTab === 'pin' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: activeTab === 'pin' ? 600 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'center',
              position: 'relative',
              transition: 'color var(--transition-fast)'
            }}
          >
            Masuk via PIN
            {activeTab === 'pin' && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'var(--color-primary)',
                  boxShadow: '0 0 10px var(--color-primary-glow)'
                }}
              />
            )}
          </button>
        </div>

        {/* ALERTS */}
        {errorMsg && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '12px', 
              borderRadius: '10px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              fontSize: '0.82rem'
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div 
            style={{ 
              padding: '12px', 
              borderRadius: '10px', 
              backgroundColor: 'rgba(16, 185, 129, 0.08)', 
              border: '1px solid rgba(16, 185, 129, 0.15)',
              color: 'var(--color-success)',
              fontSize: '0.82rem'
            }}
          >
            {successMsg}
          </div>
        )}

        {/* MAGIC LINK FORM */}
        {activeTab === 'magic-link' && (
          <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Masuk pertama kali menggunakan email Anda. Kami akan mengirimkan tautan verifikasi cepat tanpa kata sandi.
            </p>

            <div className="form-group" style={{ gap: '6px' }}>
              <label 
                className="form-label" 
                style={{ 
                  fontSize: '0.7rem', 
                  letterSpacing: '0.08em', 
                  fontWeight: 700, 
                  color: 'var(--text-muted)' 
                }}
              >
                EMAIL ANDA
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input 
                  type="email" 
                  className="glass-input" 
                  placeholder="nama@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    paddingLeft: '40px'
                  }}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ 
                width: '100%', 
                marginTop: '6px',
                background: 'linear-gradient(180deg, var(--color-primary) 0%, #3a68e0 100%)',
                boxShadow: '0 4px 12px var(--color-primary-glow)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '46px',
                borderRadius: '12px',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
              ) : (
                <>
                  Kirim Magic Link &rarr;
                </>
              )}
            </button>
          </form>
        )}

        {/* PIN LOGIN FORM */}
        {activeTab === 'pin' && (
          <form onSubmit={handlePinLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Masuk menggunakan email dan PIN keamanan Anda yang telah diatur sebelumnya di Pengaturan.
            </p>

            <div className="form-group" style={{ gap: '6px' }}>
              <label 
                className="form-label" 
                style={{ 
                  fontSize: '0.7rem', 
                  letterSpacing: '0.08em', 
                  fontWeight: 700, 
                  color: 'var(--text-muted)' 
                }}
              >
                EMAIL ANDA
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input 
                  type="email" 
                  className="glass-input" 
                  placeholder="nama@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    paddingLeft: '40px'
                  }}
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ gap: '6px' }}>
              <label 
                className="form-label" 
                style={{ 
                  fontSize: '0.7rem', 
                  letterSpacing: '0.08em', 
                  fontWeight: 700, 
                  color: 'var(--text-muted)' 
                }}
              >
                PIN ANDA
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={16} 
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
                  placeholder="••••••" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  style={{ 
                    paddingLeft: '40px'
                  }}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ 
                width: '100%', 
                marginTop: '6px',
                background: 'linear-gradient(180deg, var(--color-primary) 0%, #3a68e0 100%)',
                boxShadow: '0 4px 12px var(--color-primary-glow)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '46px',
                borderRadius: '12px',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
              ) : (
                <>
                  Masuk dengan PIN &rarr;
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* FOOTER REFLEKTIF */}
      <div 
        className="auth-footer animate-fade-in" 
        style={{ 
          marginTop: '16px', 
          textAlign: 'center', 
          fontSize: '0.68rem', 
          color: 'var(--text-secondary)', 
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.02em',
          opacity: 0.6
        }}
      >
        Since © 2026 • Kapsul Waktu Digital
      </div>
    </div>
  );
};
