import { LayoutDashboard, Users, UserCog, History, Database, LogOut, ShieldCheck, ShieldAlert, Wifi, RefreshCw, X, Target } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  syncStatus: { status: 'synced' | 'local' | 'syncing'; message: string };
  onForceSync: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  syncStatus,
  onForceSync,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const isAdmin = currentUser.role === 'Administrador';
  const isPrincipalAdmin = currentUser.username.toLowerCase().trim() === 'zotgod';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Membros & Guild', icon: Users },
    { id: 'global-goals', label: 'Metas Globais', icon: Target },
    { id: 'users', label: 'Cargos & Líderes', icon: UserCog, isPrincipalAdminOnly: true },
    { id: 'history', label: 'Histórico Geral', icon: History },
    { id: 'backup', label: 'Backup & Servidor', icon: Database },
  ];

  return (
    <aside
      className={`fixed md:relative inset-y-0 left-0 z-40 w-60 bg-[#2B2D31] border-r border-[#1E1F22] flex flex-col h-screen shrink-0 text-[#f2f3f5] transform transition-transform duration-200 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
      id="app-sidebar"
    >
      {/* Header / Guild Banner Vibe */}
      <div className="p-4 border-b border-[#1E1F22] flex items-center justify-between" id="sidebar-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#5865f2] rounded-lg flex items-center justify-center font-display font-black text-white text-sm tracking-tight">
            GM
          </div>
          <div>
            <h2 className="font-display font-bold text-sm tracking-tight text-white uppercase leading-none">
              Guild Manager
            </h2>
            <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mt-1 leading-none">
              <span className="w-1.5 h-1.5 bg-[#23a55a] rounded-full animate-pulse inline-block" />
              Roleta Russa Team / Global
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 text-gray-400 hover:text-white transition cursor-pointer"
            title="Fechar menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" id="sidebar-nav">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#949ba4] px-2.5 mb-2">
          Canais & Paineis
        </p>

        {menuItems.map((item) => {
          if ('adminOnly' in item && (item as any).adminOnly && !isAdmin) return null;
          if ('isPrincipalAdminOnly' in item && item.isPrincipalAdminOnly && !isPrincipalAdmin) return null;
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#3F4147] text-white'
                  : 'text-gray-400 hover:bg-[#35373C] hover:text-[#dbdee1]'
              }`}
              id={`sidebar-tab-${item.id}`}
            >
              <Icon size={18} className={`${isActive ? 'text-[#5865f2]' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sync status section */}
      <div className="px-3 py-2 bg-[#1E1F22]/60 border-t border-b border-[#1E1F22] text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[#949ba4] text-[10px] uppercase font-bold tracking-wider">Sync Remoto</span>
          <button 
            onClick={onForceSync}
            title="Sincronizar agora"
            className="text-[#949ba4] hover:text-white transition cursor-pointer"
            id="sync-button"
          >
            <RefreshCw size={12} className={syncStatus.status === 'syncing' ? 'animate-spin text-[#5865f2]' : ''} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi size={12} className={syncStatus.status === 'synced' ? 'text-[#23a55a]' : 'text-[#f0b232]'} />
          <span className="truncate text-[11px] text-[#b5bac1]">{syncStatus.message}</span>
        </div>
      </div>

      {/* User Footer Profile Panel */}
      <div className="p-3 bg-[#1E1F22] flex items-center justify-between border-t border-[#1E1F22]" id="sidebar-footer-profile">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative">
            <div className="w-9 h-9 bg-[#35363c] border border-white/5 rounded-full flex items-center justify-center font-bold text-sm text-[#f2f3f5]">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            {/* Status dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a55a] rounded-full border-2 border-[#1E1F22]" />
          </div>

          <div className="overflow-hidden leading-tight text-left">
            <h4 className="font-semibold text-xs text-white truncate max-w-[110px]">
              {currentUser.username}
            </h4>
            <span className="text-[10px] text-[#b5bac1] flex items-center gap-0.5 truncate">
              {isAdmin ? (
                <ShieldCheck size={10} className="text-[#5865f2] shrink-0" />
              ) : (
                <ShieldAlert size={10} className="text-[#f0b232] shrink-0" />
              )}
              {currentUser.role}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          title="Sair do painel"
          className="p-1.5 text-[#949ba4] hover:text-[#f23f43] hover:bg-[#35363c] rounded-md transition duration-150 cursor-pointer"
          id="logout-button"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
