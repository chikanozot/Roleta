import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';
import { User, Member, DatabaseState } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MemberManager from './components/MemberManager';
import UserManager from './components/UserManager';
import HistoryLogs from './components/HistoryLogs';
import BackupManager from './components/BackupManager';
import MemberProfileModal from './components/MemberProfileModal';
import GlobalGoalsManager from './components/GlobalGoalsManager';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('guild_manager_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Database State
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [memberFilterPreset, setMemberFilterPreset] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync status indicator
  const [syncStatus, setSyncStatus] = useState<{ status: 'synced' | 'local' | 'syncing'; message: string }>({
    status: 'syncing',
    message: 'Carregando banco de dados...'
  });

  // Action: Fetch full DB from server with optional cache merge
  const fetchDbState = async (forceSync = false) => {
    setSyncStatus({ status: 'syncing', message: 'Conectando...' });
    try {
      const response = await fetch('/api/db');
      if (!response.ok) {
        throw new Error('Falha ao conectar com o banco de dados do servidor.');
      }
      
      const serverState = (await response.json()) as DatabaseState;
      
      // Check local cache for disaster-recovery / Cloud Run cold boot restarts
      const localCacheRaw = localStorage.getItem('guild_manager_db_cache');
      let finalState = serverState;

      if (localCacheRaw) {
        try {
          const localState = JSON.parse(localCacheRaw) as DatabaseState;
          const serverLogs = serverState.history?.length || 0;
          const localLogs = localState.history?.length || 0;

          // If local client has more history logs than the server (meaning container restarted and memory wiped)
          if (localLogs > serverLogs || forceSync) {
            setSyncStatus({ status: 'syncing', message: 'Restaurando cache local...' });
            
            // Sync server with local cache
            const syncResponse = await fetch('/api/db/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(localState),
            });

            if (syncResponse.ok) {
              finalState = localState;
              setSyncStatus({ status: 'synced', message: 'Cache local sincronizado' });
            } else {
              setSyncStatus({ status: 'local', message: 'Servidor limpo (Cache local mantido)' });
            }
          } else {
            // Server is more up-to-date or equal, update local cache to match server
            localStorage.setItem('guild_manager_db_cache', JSON.stringify(serverState));
            setSyncStatus({ status: 'synced', message: 'Sincronizado com nuvem' });
          }
        } catch (cacheErr) {
          console.error('Error handling local storage sync fallback:', cacheErr);
          setSyncStatus({ status: 'synced', message: 'Conectado' });
        }
      } else {
        // No local cache yet, save it
        localStorage.setItem('guild_manager_db_cache', JSON.stringify(serverState));
        setSyncStatus({ status: 'synced', message: 'Sincronizado com nuvem' });
      }

      setDbState(finalState);
    } catch (err: any) {
      console.error('Fetch DB error:', err);
      // Fail-soft: Use local cache if server is completely offline
      const localCacheRaw = localStorage.getItem('guild_manager_db_cache');
      if (localCacheRaw) {
        setDbState(JSON.parse(localCacheRaw));
        setSyncStatus({ status: 'local', message: 'Modo Offline (Dados locais)' });
      } else {
        // Safe Client-Side Default Fallback to prevent infinite loading
        const defaultState: DatabaseState = {
          users: [
            { id: 'user-zotgod', username: 'zOtGOD', role: 'Administrador', active: true, isMaster: true, createdAt: new Date().toISOString() }
          ],
          members: [
            {
              id: 'member-1',
              main: 'Kharsek',
              tsNick: 'Kharsek [TS]',
              joinDate: '2025-01-15',
              responsibleLeader: 'zOtGOD',
              status: 'Active',
              notes: 'Membro lendário, focado em bosses e hunts de alto nível.',
              access: { sanguine: true, crypt: true, dragon: true },
              makers: [
                {
                  id: 'maker-1-1',
                  name: 'Kharsek Maker',
                  levelGoals: [
                    { id: 'g1', goal: '450+', date: '2025-02-10', time: '14:30', byUser: 'admin' },
                    { id: 'g2', goal: '500+', date: '2025-04-12', time: '18:15', byUser: 'lider' }
                  ],
                  createdAt: '2025-02-10T14:30:00.000Z'
                }
              ],
              warnings: [
                {
                  id: 'warn-1-1',
                  reason: 'Atraso sem justificativa na war de sábado.',
                  date: '2025-03-01',
                  time: '21:00',
                  byLeader: 'lider',
                  removed: true,
                  removedBy: 'admin',
                  removedDate: '2025-03-15',
                  removedTime: '15:20'
                }
              ],
              createdAt: '2025-01-15T12:00:00.000Z',
              updatedAt: '2025-04-12T18:15:00.000Z'
            },
            {
              id: 'member-2',
              main: 'Eternal Oblivion',
              tsNick: 'EO [Team]',
              joinDate: '2025-03-10',
              responsibleLeader: 'lider',
              status: 'Active',
              notes: 'Excelente blocker, participa ativamente de todos os serviços.',
              access: { sanguine: true, crypt: false, dragon: true },
              makers: [],
              warnings: [
                {
                  id: 'warn-2-1',
                  reason: 'Ausência em reunião de estratégia.',
                  date: '2025-06-20',
                  time: '20:10',
                  byLeader: 'lider',
                  removed: false
                }
              ],
              createdAt: '2025-03-10T15:00:00.000Z',
              updatedAt: '2025-06-20T20:10:00.000Z'
            }
          ],
          history: [
            {
              id: 'hist-init',
              timestamp: new Date().toISOString(),
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString('pt-BR', { hour12: false }).substring(0, 5),
              username: 'Sistema',
              action: 'INICIALIZAÇÃO',
              details: 'Banco de dados inicializado localmente em modo contingência.'
            }
          ],
          accessTypes: [
            { id: 'sanguine', label: 'Sanguine' },
            { id: 'crypt', label: 'Crypt' },
            { id: 'dragon', label: 'Dragãozinho' }
          ],
          roles: ['Administrador', 'Líder'],
          globalGoals: {
            sanguine: false,
            crypt: false,
            dragon: false,
            makerLevel: '450+'
          }
        };
        localStorage.setItem('guild_manager_db_cache', JSON.stringify(defaultState));
        setDbState(defaultState);
        setSyncStatus({ status: 'local', message: 'Offline (Banco inicializado)' });
      }
    }
  };

  // Run initial state load
  useEffect(() => {
    if (currentUser) {
      fetchDbState();
    }
  }, [currentUser]);

  // Handle Login
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('guild_manager_user', JSON.stringify(user));
  };

  // Handle Logout
  const handleLogout = async () => {
    if (currentUser) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser.username }),
        });
      } catch (err) {
        console.error('Logout log error:', err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('guild_manager_user');
  };

  // Handle forcing a manual sync
  const handleForceSync = () => {
    fetchDbState(true);
  };

  // Open member profile detailed panel
  const handleViewMember = (member: Member) => {
    setSelectedMemberId(member.id);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (!dbState) {
    return (
      <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#5865f2]/20 border-t-[#5865f2] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide text-[#b5bac1]">
            Carregando Guild Manager...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#313338] select-none" id="app-root">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-[#2B2D31] text-white h-14 px-4 flex items-center justify-between border-b border-[#1E1F22] shrink-0" id="mobile-header">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
          id="mobile-menu-toggle"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#5865f2] rounded-md flex items-center justify-center font-display font-black text-white text-xs tracking-tight">
            GM
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-white uppercase">
            Guild Manager
          </span>
        </div>
        <div className="w-6" /> {/* Spacer to balance layout */}
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
          id="sidebar-overlay"
        />
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onForceSync={handleForceSync}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 bg-[#313338] flex flex-col relative" id="app-main">
        {/* Active tab content rendering */}
        <AnimatePresence mode="wait">
          {currentTab === 'dashboard' && (
            <Dashboard 
              members={dbState.members} 
              history={dbState.history} 
              onViewMember={handleViewMember} 
              onNavigateToMembers={(preset: any) => {
                setMemberFilterPreset(preset);
                setCurrentTab('members');
              }}
            />
          )}

          {currentTab === 'members' && (
            <MemberManager
              dbState={dbState}
              currentUser={currentUser}
              onRefresh={fetchDbState}
              onViewMember={handleViewMember}
              filterPreset={memberFilterPreset}
              onClearPreset={() => setMemberFilterPreset(null)}
            />
          )}

          {currentTab === 'global-goals' && (
            <GlobalGoalsManager
              dbState={dbState}
              currentUser={currentUser}
              onRefresh={fetchDbState}
            />
          )}

          {currentTab === 'users' && (
            <UserManager
              currentUser={currentUser}
              onRefresh={fetchDbState}
            />
          )}

          {currentTab === 'history' && (
            <HistoryLogs 
              history={dbState.history} 
            />
          )}

          {currentTab === 'backup' && (
            <BackupManager
              dbState={dbState}
              currentUser={currentUser}
              syncStatus={syncStatus}
              onRefresh={fetchDbState}
              onForceSync={handleForceSync}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Detailed Member Profile Overlay Modal */}
      <AnimatePresence>
        {selectedMemberId && (
          <MemberProfileModal
            memberId={selectedMemberId}
            dbState={dbState}
            currentUser={currentUser}
            onClose={() => setSelectedMemberId(null)}
            onRefresh={fetchDbState}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
