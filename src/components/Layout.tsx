import { 
  LayoutDashboard, 
  Hourglass, 
  RefreshCw, 
  Milestone, 
  Settings,
  Tags
} from 'lucide-react';
import { Logo } from './Logo';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  children
}) => {
  return (
    <div className="app-container">
      {/* HEADER ATAS */}
      <header className="app-header">
        <div className="logo-container">
          <Logo size={28} />
          <span className="logo-text" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Since</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onOpenSettings} 
            className="btn-icon" 
            title="Pengaturan Aplikasi"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* NO SANDBOX NOTICE */}

      {/* ISI TAB UTAMA */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* DOCK NAVIGASI BAWAH */}
      <div className="nav-dock-container">
        <nav className="nav-dock">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab('sejak')}
            className={`nav-item ${activeTab === 'sejak' ? 'active' : ''}`}
          >
            <Hourglass size={20} />
            <span>Sejak</span>
          </button>

          <button 
            onClick={() => setActiveTab('terakhir')}
            className={`nav-item ${activeTab === 'terakhir' ? 'active' : ''}`}
          >
            <RefreshCw size={20} />
            <span>Terakhir</span>
          </button>

          <button 
            onClick={() => setActiveTab('masa-depan')}
            className={`nav-item ${activeTab === 'masa-depan' ? 'active' : ''}`}
          >
            <Milestone size={20} />
            <span>Masa Depan</span>
          </button>

          <button 
            onClick={() => setActiveTab('kategori')}
            className={`nav-item ${activeTab === 'kategori' ? 'active' : ''}`}
          >
            <Tags size={20} />
            <span>Kategori</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
