import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Edit3, Key, Shield, UserCheck, UserX, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { User, DatabaseState } from '../types';

interface UserManagerProps {
  currentUser: User;
  onRefresh: () => void;
}

export default function UserManager({ currentUser, onRefresh }: UserManagerProps) {
  // Let's hold local user list specifically with passwords if admin
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal displays
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Líder');
  const [newActive, setNewActive] = useState(true);

  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState(''); // Leave blank to keep original
  const [editRole, setEditRole] = useState('Líder');
  const [editActive, setEditActive] = useState(true);

  // Fetch complete users list (including password metadata for editing if admin)
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users?requester=${encodeURIComponent(currentUser.username)}`);
      if (response.ok) {
        const data = await response.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setErrorMsg('Todos os campos são obrigatórios para a criação de usuários.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          active: newActive,
          creatorUsername: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar usuário.');
      }

      setSuccessMsg(`Usuário "${newUsername}" criado com sucesso!`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('Líder');
      setNewActive(true);
      
      fetchUsers();
      onRefresh();

      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUsername(user.username);
    setEditPassword(''); // Leave blank by default
    setEditRole(user.role);
    setEditActive(user.active);

    setShowEditModal(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editUsername.trim()) {
      setErrorMsg('O nome de usuário não pode ficar em branco.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername,
          password: editPassword || undefined, // Only send if set
          role: editRole,
          active: editActive,
          editorUsername: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar usuário.');
      }

      setSuccessMsg(`Usuário "${editUsername}" editado com sucesso!`);
      
      fetchUsers();
      onRefresh();

      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-64px)]" id="users-view">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1E1F22] pb-5" id="users-header">
        <div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight uppercase">
            Cargos & Líderes do Sistema
          </h1>
          <p className="text-[#949ba4] text-sm font-medium">
            Gerenciamento de acessos administrativos ao painel Guild Manager.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#5865f2]/10 shrink-0 self-start md:self-auto"
          id="btn-add-user"
        >
          <UserPlus size={16} />
          Criar Usuário / Líder
        </button>
      </div>

      {/* Users table */}
      <div className="discord-card rounded-xl overflow-hidden" id="users-table-card">
        {isLoading ? (
          <div className="p-12 text-center text-[#949ba4] flex flex-col items-center gap-2">
            <span className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span>Carregando usuários...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm" id="users-table">
              <thead>
                <tr className="bg-[#1E1F22] border-b border-[#1E1F22] text-[#949ba4] text-xs font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Nome de Usuário</th>
                  <th className="px-5 py-3.5">Cargo / Hierarquia</th>
                  <th className="px-5 py-3.5">Data de Criação</th>
                  <th className="px-5 py-3.5 text-center">Status Acesso</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1F22]" id="users-table-body">
                {usersList.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-[#35373C] transition ${
                        !user.active ? 'opacity-55' : ''
                      }`}
                    >
                      {/* Username */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#1E1F22] border border-white/5 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase">
                            {user.username.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-white block">
                              {user.username}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] bg-[#5865f2]/10 border border-[#5865f2]/20 text-[#5865f2] font-semibold py-0.25 px-1.5 rounded uppercase mt-0.5 inline-block">
                                Você
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Cargo */}
                      <td className="px-5 py-4 whitespace-nowrap text-[#dbdee1] font-medium">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${
                          user.role === 'Administrador' 
                            ? 'bg-[#5865f2]/10 text-[#5865f2] border-[#5865f2]/20' 
                            : 'bg-[#b5bac1]/10 text-[#dbdee1] border-[#1E1F22]'
                        }`}>
                          {user.role === 'Administrador' ? <Shield size={12} /> : <ShieldAlert size={12} />}
                          {user.role}
                        </span>
                      </td>

                      {/* Creation Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-[#949ba4] font-mono">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Active Status */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 font-bold uppercase text-[10px] rounded-full ${
                          user.active 
                            ? 'bg-[#23a55a]/15 text-[#23a55a]' 
                            : 'bg-[#f23f43]/15 text-[#f23f43]'
                        }`}>
                          {user.active ? 'Ativo' : 'Desativado'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={isCurrent} // Prevent lockouts on current user
                          title={isCurrent ? 'Não é possível editar a si mesmo por aqui' : 'Editar Usuário'}
                          className="p-2 bg-[#1E1F22] hover:bg-[#35373C] text-white rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Edit3 size={13} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD USER */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#2B2D31] border border-[#1E1F22] rounded-xl overflow-hidden shadow-2xl relative"
              id="add-user-modal"
            >
              <div className="h-1.5 bg-[#5865f2] w-full" />

              <div className="p-5 border-b border-[#1E1F22] flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white uppercase tracking-tight">
                  Criar Novo Usuário / Líder
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-[#949ba4] hover:text-white transition font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle size={15} /> <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-[#23a55a]/10 border border-[#23a55a]/20 text-[#23a55a] rounded-lg text-xs flex items-center gap-2">
                    <Check size={15} /> <span>{successMsg}</span>
                  </div>
                )}

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Nome de Usuário (Login)
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ex: caio_lider"
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Insira a senha inicial"
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Cargo / Hierarquia
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none cursor-pointer"
                  >
                    <option value="Líder">Líder</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                {/* Active Status checkbox */}
                <label className="flex items-center gap-3 text-xs text-[#dbdee1] select-none cursor-pointer pt-1 hover:text-white">
                  <input
                    type="checkbox"
                    checked={newActive}
                    onChange={(e) => setNewActive(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-[#1E1F22] text-[#5865f2] focus:ring-[#5865f2] bg-[#1E1F22]"
                  />
                  <span>Permitir acesso imediato ao painel (Ativo)</span>
                </label>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E1F22]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-[#1E1F22] hover:bg-[#35373C] text-[#dbdee1] font-semibold py-1.5 px-3.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Criar Conta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT USER */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#2B2D31] border border-[#1E1F22] rounded-xl overflow-hidden shadow-2xl relative"
              id="edit-user-modal"
            >
              <div className="h-1.5 bg-[#f0b232] w-full" />

              <div className="p-5 border-b border-[#1E1F22] flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white uppercase tracking-tight">
                  Editar Usuário: <span className="text-[#f0b232]">{selectedUser.username}</span>
                </h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-[#949ba4] hover:text-white transition font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditUser} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle size={15} /> <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-[#23a55a]/10 border border-[#23a55a]/20 text-[#23a55a] rounded-lg text-xs flex items-center gap-2">
                    <Check size={15} /> <span>{successMsg}</span>
                  </div>
                )}

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Nome de Usuário (Login)
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Alterar Senha <span className="text-[10px] text-[#949ba4] font-normal lowercase">(Deixe em branco para não alterar)</span>
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Nova senha opcional"
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Cargo / Hierarquia
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none cursor-pointer"
                  >
                    <option value="Líder">Líder</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                {/* Active Status checkbox */}
                <label className="flex items-center gap-3 text-xs text-[#dbdee1] select-none cursor-pointer pt-1 hover:text-white">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-[#1E1F22] text-[#5865f2] focus:ring-[#5865f2] bg-[#1E1F22]"
                  />
                  <span>Conta ativa de acesso (Ativo)</span>
                </label>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E1F22]">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="bg-[#1E1F22] hover:bg-[#35373C] text-[#dbdee1] font-semibold py-1.5 px-3.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
