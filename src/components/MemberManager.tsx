import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, UserCheck, UserX, AlertTriangle, ShieldCheck, ShieldAlert, 
  Calendar, Eye, Edit2, Shield, Heart, MoreVertical, PlusCircle, Check, HelpCircle, Trash2
} from 'lucide-react';
import { Member, User, DatabaseState } from '../types';
import { auditMember } from '../lib/audit';

export interface MemberFilterPreset {
  searchTerm?: string;
  statusFilter?: 'All' | 'Active' | 'Inactive';
  accessFilter?: string;
  specialFilter?: 'None' | 'WithMakers' | 'WithWarnings';
}

interface MemberManagerProps {
  dbState: DatabaseState;
  currentUser: User;
  onRefresh: () => void;
  onViewMember: (member: Member) => void;
  filterPreset?: MemberFilterPreset | null;
  onClearPreset?: () => void;
}

export default function MemberManager({ dbState, currentUser, onRefresh, onViewMember, filterPreset, onClearPreset }: MemberManagerProps) {
  const { members, users, accessTypes } = dbState;

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('Active');
  const [accessFilter, setAccessFilter] = useState<string>('All');
  const [specialFilter, setSpecialFilter] = useState<'None' | 'WithMakers' | 'WithWarnings'>('None');

  useEffect(() => {
    if (filterPreset) {
      if (filterPreset.searchTerm !== undefined) setSearchTerm(filterPreset.searchTerm);
      if (filterPreset.statusFilter !== undefined) setStatusFilter(filterPreset.statusFilter);
      if (filterPreset.accessFilter !== undefined) setAccessFilter(filterPreset.accessFilter);
      if (filterPreset.specialFilter !== undefined) setSpecialFilter(filterPreset.specialFilter);
      if (onClearPreset) {
        onClearPreset();
      }
    }
  }, [filterPreset, onClearPreset]);
  
  // Modals visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMakerModal, setShowMakerModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Selected entities for modals
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Form states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Member Form
  const [newMain, setNewMain] = useState('');
  const [newTsNick, setNewTsNick] = useState('');
  const [newJoinDate, setNewJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLeader, setNewLeader] = useState(currentUser.username);
  const [newNotes, setNewNotes] = useState('');
  const [newAccess, setNewAccess] = useState<{ [key: string]: boolean }>({
    sanguine: false,
    crypt: false,
    dragon: false,
  });
  const [newInitialMakers, setNewInitialMakers] = useState<Array<{ name: string; level: string; isManual: boolean }>>([]);

  // New Maker Form
  const [makerName, setMakerName] = useState('');

  // New Warning Form
  const [warningReason, setWarningReason] = useState('');

  // Edit Member Form (populated on open)
  const [editMain, setEditMain] = useState('');
  const [editTsNick, setEditTsNick] = useState('');
  const [editJoinDate, setEditJoinDate] = useState('');
  const [editLeader, setEditLeader] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editAccess, setEditAccess] = useState<{ [key: string]: boolean }>({});
  const [makersToDelete, setMakersToDelete] = useState<string[]>([]);

  // Inline Makers & levels form states inside Edit Modal
  const [localMakerName, setLocalMakerName] = useState('');
  const [localMakerLevel, setLocalMakerLevel] = useState('none');
  const [localCustomLevel, setLocalCustomLevel] = useState('');
  const [addingLevelForMakerId, setAddingLevelForMakerId] = useState<string | null>(null);
  const [newLevelGoalValue, setNewLevelGoalValue] = useState('250+');
  const [customLevelGoalValue, setCustomLevelGoalValue] = useState('');

  // Helper to find highest goal of a Maker
  const getHighestGoal = (member: Member): string => {
    let maxGoalNum = 0;
    let maxGoalStr = 'Nenhuma';

    member.makers.forEach(maker => {
      maker.levelGoals.forEach(g => {
        const num = parseInt(g.goal.replace('+', ''), 10) || 0;
        if (num > maxGoalNum) {
          maxGoalNum = num;
          maxGoalStr = g.goal;
        }
      });
    });

    return maxGoalStr;
  };

  // Instant Search & Filter implementation
  const filteredMembers = members.filter(member => {
    // 1. Status Filter
    if (statusFilter !== 'All' && member.status !== statusFilter) {
      return false;
    }

    // 2. Access Filter
    if (accessFilter !== 'All') {
      if (!member.access[accessFilter]) {
        return false;
      }
    }

    // 2.5 Special Filter
    if (specialFilter === 'WithMakers' && member.makers.length === 0) {
      return false;
    }
    if (specialFilter === 'WithWarnings' && member.warnings.filter(w => !w.removed).length === 0) {
      return false;
    }

    // 3. Search text
    if (!searchTerm.trim()) return true;
    
    const query = searchTerm.toLowerCase().trim();
    
    // Search fields
    const mainMatch = member.main.toLowerCase().includes(query);
    const tsMatch = member.tsNick.toLowerCase().includes(query);
    const leaderMatch = member.responsibleLeader.toLowerCase().includes(query);
    const noteMatch = member.notes.toLowerCase().includes(query);
    const statusText = member.status === 'Active' ? 'ativo' : 'inativo';
    const statusMatch = statusText.includes(query);

    // Search Makers
    const makerMatch = member.makers.some(mk => mk.name.toLowerCase().includes(query));
    
    // Search Level Goals inside makers
    const goalMatch = member.makers.some(mk => 
      mk.levelGoals.some(g => g.goal.toLowerCase().includes(query))
    );

    // Search Warnings
    const warningMatch = member.warnings.some(warn => 
      warn.reason.toLowerCase().includes(query) || warn.byLeader.toLowerCase().includes(query)
    );

    return mainMatch || tsMatch || leaderMatch || noteMatch || statusMatch || makerMatch || goalMatch || warningMatch;
  });

  // Action: Add Member Submit
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMain.trim()) {
      setErrorMsg('O nome do personagem Main é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main: newMain,
          tsNick: newTsNick,
          joinDate: newJoinDate,
          responsibleLeader: newLeader,
          notes: newNotes,
          access: newAccess,
          status: 'Active',
          username: currentUser.username,
          initialMakers: newInitialMakers
            .filter(m => m.name.trim() !== '')
            .map(m => ({
              name: m.name.trim(),
              level: m.level.trim()
            }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar membro.');
      }

      setSuccessMsg(`Membro ${newMain} cadastrado com sucesso!`);
      // Reset form
      setNewMain('');
      setNewTsNick('');
      setNewJoinDate(new Date().toISOString().split('T')[0]);
      setNewNotes('');
      setNewAccess({ sanguine: false, crypt: false, dragon: false });
      setNewInitialMakers([]);
      
      onRefresh();
      
      // Delay closing modal so success msg can be seen
      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar membro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditMain(member.main);
    setEditTsNick(member.tsNick);
    setEditJoinDate(member.joinDate);
    setEditLeader(member.responsibleLeader);
    setEditNotes(member.notes);
    setEditStatus(member.status);
    setMakersToDelete([]);
    
    // Set edit access state
    const currentAccessState: { [key: string]: boolean } = {};
    accessTypes.forEach(type => {
      currentAccessState[type.id] = !!member.access[type.id];
    });
    setEditAccess(currentAccessState);

    // Reset inline makers states
    setLocalMakerName('');
    setLocalMakerLevel('none');
    setLocalCustomLevel('');
    setAddingLevelForMakerId(null);
    setNewLevelGoalValue('250+');
    setCustomLevelGoalValue('');

    setShowEditModal(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Action: Edit Member Submit
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!editMain.trim()) {
      setErrorMsg('O nome do personagem Main é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/members/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main: editMain,
          tsNick: editTsNick,
          joinDate: editJoinDate,
          responsibleLeader: editLeader,
          notes: editNotes,
          status: editStatus,
          access: editAccess,
          username: currentUser.username,
          makersToDelete: makersToDelete
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar membro.');
      }

      setSuccessMsg(`Membro ${editMain} atualizado com sucesso!`);
      onRefresh();

      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar membro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Local Handlers inside Edit Modal to manage Makers
  const handleAddMakerLocal = async (memberId: string) => {
    if (!localMakerName.trim()) {
      setErrorMsg('O nome do Maker é obrigatório.');
      return;
    }

    try {
      setErrorMsg(null);
      // 1. Create the Maker
      const response = await fetch(`/api/members/${memberId}/makers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: localMakerName.trim(),
          username: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao adicionar Maker.');
      }

      // 2. If a level is selected, add it as a goal
      const selectedLevel = localMakerLevel === 'custom' ? localCustomLevel.trim() : localMakerLevel;
      if (selectedLevel && selectedLevel !== 'none') {
        const formattedGoal = /^\d+$/.test(selectedLevel) ? `${selectedLevel}+` : selectedLevel;
        await fetch(`/api/members/${memberId}/makers/${data.id}/goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: formattedGoal,
            username: currentUser.username
          })
        });
      }

      // Success
      setLocalMakerName('');
      setLocalMakerLevel('none');
      setLocalCustomLevel('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao adicionar Maker.');
    }
  };

  const handleAddGoalToMakerLocal = async (memberId: string, makerId: string) => {
    const selectedLevel = newLevelGoalValue === 'custom' ? customLevelGoalValue.trim() : newLevelGoalValue;
    if (!selectedLevel) {
      setErrorMsg('O level/meta é obrigatório.');
      return;
    }

    const formattedGoal = /^\d+$/.test(selectedLevel) ? `${selectedLevel}+` : selectedLevel;

    try {
      setErrorMsg(null);
      const response = await fetch(`/api/members/${memberId}/makers/${makerId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: formattedGoal,
          username: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao registrar meta.');
      }

      setAddingLevelForMakerId(null);
      setNewLevelGoalValue('250+');
      setCustomLevelGoalValue('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar meta.');
    }
  };

  const handleDeleteMakerLocal = async (memberId: string, makerId: string, makerName: string) => {
    if (!confirm(`Tem certeza que deseja remover o Maker "${makerName}"?`)) {
      return;
    }

    try {
      setErrorMsg(null);
      const response = await fetch(`/api/members/${memberId}/makers/${makerId}?username=${encodeURIComponent(currentUser.username)}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao remover Maker.');
      }

      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao remover Maker.');
    }
  };

  // Open Maker Add Modal
  const openMakerModal = (member: Member) => {
    setSelectedMember(member);
    setMakerName('');
    setShowMakerModal(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Action: Maker Add Submit
  const handleAddMaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!makerName.trim()) {
      setErrorMsg('O nome do Maker é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/members/${selectedMember.id}/makers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: makerName,
          username: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao adicionar Maker.');
      }

      setSuccessMsg(`Maker "${makerName}" adicionado com sucesso a ${selectedMember.main}!`);
      onRefresh();

      setTimeout(() => {
        setShowMakerModal(false);
        setSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar Maker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Warning Modal
  const openWarningModal = (member: Member) => {
    setSelectedMember(member);
    setWarningReason('');
    setShowWarningModal(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Action: Warning Submit
  const handleAddWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!warningReason.trim()) {
      setErrorMsg('O motivo do Warning é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/members/${selectedMember.id}/warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: warningReason,
          username: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar Warning.');
      }

      setSuccessMsg(`Warning adicionado com sucesso para ${selectedMember.main}!`);
      onRefresh();

      setTimeout(() => {
        setShowWarningModal(false);
        setSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar Warning.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status (Soft delete / recover)
  const toggleMemberStatus = async (member: Member) => {
    const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          username: currentUser.username
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.message || 'Erro ao alterar status.');
      }

      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do membro.');
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-64px)]" id="members-view">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1E1F22] pb-5" id="members-header">
        <div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight uppercase">
            Membros da Guild
          </h1>
          <p className="text-[#949ba4] text-sm font-medium">
            Gerencie personagens main, makers, metas de level, acessos a quests e warnings.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#5865f2]/10 shrink-0 self-start md:self-auto"
          id="btn-add-member"
        >
          <Plus size={16} />
          Cadastrar Membro
        </button>
      </div>

      {/* Filters Panel (Discord Style) */}
      <div className="discord-card rounded-xl p-4 space-y-4" id="members-filters-panel">
        <div className="flex flex-col md:flex-row gap-4" id="filters-container">
          
          {/* Instant Search input */}
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949ba4]">
              <Search size={18} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisa instantânea (Main, Maker, TS, Meta, Líder, Warnings...)"
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 pl-11 pr-4 text-sm text-[#f2f3f5] placeholder-[#949ba4] focus:outline-none focus:border-[#5865f2] transition"
              id="members-search-input"
            />
          </div>

          {/* Status Select */}
          <div className="w-full md:w-44 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4]">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] cursor-pointer"
              id="status-filter-select"
            >
              <option value="Active">Ativos</option>
              <option value="Inactive">Inativos</option>
              <option value="All">Todos</option>
            </select>
          </div>

          {/* Accesses Select */}
          <div className="w-full md:w-44 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4]">
              Acesso Quest
            </label>
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] cursor-pointer"
              id="access-filter-select"
            >
              <option value="All">Todos Acessos</option>
              {accessTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Special Filter Select */}
          <div className="w-full md:w-44 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4]">
              Filtro Especial
            </label>
            <select
              value={specialFilter}
              onChange={(e: any) => setSpecialFilter(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] cursor-pointer"
              id="special-filter-select"
            >
              <option value="None">Todos</option>
              <option value="WithMakers">Apenas com Makers</option>
              <option value="WithWarnings">Com Warnings Ativos</option>
            </select>
          </div>
        </div>

        {/* Counter of results */}
        <div className="flex items-center justify-between text-xs text-[#949ba4] px-1" id="filter-results-info">
          <span>
            Mostrando <strong className="text-white">{filteredMembers.length}</strong> de <strong className="text-white">{members.length}</strong> membros cadastrados.
          </span>
          {(searchTerm || statusFilter !== 'Active' || accessFilter !== 'All' || specialFilter !== 'None') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('Active');
                setAccessFilter('All');
                setSpecialFilter('None');
              }}
              className="text-[#5865f2] hover:underline cursor-pointer font-medium"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Members Grid / Table */}
      <div className="discord-card rounded-xl overflow-hidden" id="members-list-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm" id="members-table">
            <thead>
              <tr className="bg-[#1E1F22] border-b border-[#1E1F22] text-[#949ba4] text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Personagem (Main)</th>
                <th className="px-5 py-3.5">Nick TeamSpeak</th>
                <th className="px-5 py-3.5">Líder Resp.</th>
                <th className="px-5 py-3.5 text-center">Makers</th>
                <th className="px-5 py-3.5 text-center">Maior Meta</th>
                <th className="px-5 py-3.5">Acessos Quests</th>
                <th className="px-5 py-3.5 text-center">Warnings</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1F22]" id="members-table-body">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#949ba4]">
                    Nenhum membro corresponde aos filtros de pesquisa aplicados.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const activeWarns = member.warnings.filter(w => !w.removed);
                  const highestMeta = getHighestGoal(member);

                  return (
                    <tr 
                      key={member.id} 
                      className={`hover:bg-[#35373C] transition group ${
                        member.status === 'Inactive' ? 'opacity-55' : ''
                      }`}
                    >
                      {/* Main Character with Status icon */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            member.status === 'Active' ? 'bg-[#23a55a]' : 'bg-[#f23f43]'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white block group-hover:text-[#5865f2] transition duration-150">
                                {member.main}
                              </span>
                              {(() => {
                                const audit = auditMember(member, dbState.globalGoals);
                                return audit.hasWarnings && (
                                  <span className="text-[#f0b232] cursor-help" title="Este membro possui pendências com as metas globais do servidor!">
                                    <AlertTriangle size={14} className="animate-pulse" />
                                  </span>
                                );
                              })()}
                            </div>
                            <span className="text-[10px] text-[#949ba4] font-mono flex items-center gap-1 mt-0.5">
                              <Calendar size={10} /> Entrou: {member.joinDate}
                            </span>
                            
                            {(() => {
                              const audit = auditMember(member, dbState.globalGoals);
                              if (!audit.hasWarnings) return null;
                              return (
                                <div className="flex flex-col gap-1 mt-1.5">
                                  {audit.missingAccesses.length > 0 && (
                                    <span className="inline-flex items-center text-[9px] font-extrabold uppercase text-[#f0b232] bg-[#f0b232]/10 px-1.5 py-0.5 rounded border border-[#f0b232]/25 w-max" title={`Faltando acessos: ${audit.missingAccesses.join(', ')}`}>
                                      Acesso Pendente
                                    </span>
                                  )}
                                  {audit.noMakers && (
                                    <span className="inline-flex items-center text-[9px] font-extrabold uppercase text-[#f23f43] bg-[#f23f43]/10 px-1.5 py-0.5 rounded border border-[#f23f43]/25 w-max" title="Exige pelo menos um Maker cadastrado com o level mínimo!">
                                      Sem Maker Cadastrado
                                    </span>
                                  )}
                                  {audit.belowLevelMakers.length > 0 && (
                                    <span className="inline-flex items-center text-[9px] font-extrabold uppercase text-[#f0b232] bg-[#f0b232]/10 px-1.5 py-0.5 rounded border border-[#f0b232]/25 w-max" title={audit.belowLevelMakers.map(m => `${m.name} (${m.currentLevel}/${m.targetLevel}+)`).join(', ')}>
                                      Maker abaixo do level
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* TS Nick */}
                      <td className="px-5 py-4 whitespace-nowrap text-[#dbdee1] font-medium">
                        {member.tsNick || <span className="text-xs text-[#949ba4] italic">Não informado</span>}
                      </td>

                      {/* Responsible Leader */}
                      <td className="px-5 py-4 whitespace-nowrap text-[#b5bac1]">
                        <span className="bg-[#1E1F22] text-xs text-[#f2f3f5] font-semibold py-1 px-2.5 rounded-md border border-white/5">
                          {member.responsibleLeader}
                        </span>
                      </td>

                      {/* Makers count bubble */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className={`inline-block font-mono font-bold text-xs rounded-full px-2 py-0.5 ${
                          member.makers.length > 0 
                            ? 'bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/20' 
                            : 'bg-[#1E1F22] text-[#949ba4] border border-[#1E1F22]'
                        }`}>
                          {member.makers.length}
                        </span>
                      </td>

                      {/* Highest Level Goal reached */}
                      <td className="px-5 py-4 whitespace-nowrap text-center font-mono font-bold">
                        {highestMeta !== 'Nenhuma' ? (
                          <span className="text-[#23a55a] bg-[#23a55a]/10 border border-[#23a55a]/20 px-2 py-0.5 rounded text-xs">
                            {highestMeta}
                          </span>
                        ) : (
                          <span className="text-[#949ba4] font-normal text-xs">—</span>
                        )}
                      </td>

                      {/* Acessos Lists */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex gap-2 text-[10px] font-black uppercase tracking-wider">
                          <span className={`px-2 py-0.5 rounded border ${
                            member.access.sanguine 
                              ? 'bg-[#f23f43]/15 text-[#f23f43] border-[#f23f43]/30' 
                              : 'bg-transparent text-[#949ba4] border-[#1E1F22]'
                          }`} title="Sanguine Quest Access">
                            Sanguine
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${
                            member.access.crypt 
                              ? 'bg-[#8a5cf5]/15 text-[#c6b1f9] border-[#8a5cf5]/30' 
                              : 'bg-transparent text-[#949ba4] border-[#1E1F22]'
                          }`} title="Crypt Access">
                            Crypt
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${
                            member.access.dragon 
                              ? 'bg-[#31c4f3]/15 text-[#99e2fa] border-[#31c4f3]/30' 
                              : 'bg-transparent text-[#949ba4] border-[#1E1F22]'
                          }`} title="Acesso Dragãozinho">
                            Dragãozinho
                          </span>
                        </div>
                      </td>

                      {/* Warnings alert counts */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        {activeWarns.length > 0 ? (
                          <span className="bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] text-xs font-bold font-mono py-0.5 px-2 rounded-full inline-flex items-center gap-1">
                            <AlertTriangle size={11} /> {activeWarns.length}
                          </span>
                        ) : (
                          <span className="text-[#23a55a] font-semibold text-xs flex items-center justify-center gap-1">
                            <ShieldCheck size={14} /> Zero
                          </span>
                        )}
                      </td>

                      {/* Actions Buttons Column */}
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                          
                          {/* Profile Button */}
                          <button
                            onClick={() => onViewMember(member)}
                            title="Ver Perfil Detalhado"
                            className="p-1.5 bg-[#2B2D31] hover:bg-[#35373C] text-white rounded transition cursor-pointer"
                            id={`btn-profile-${member.id}`}
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(member)}
                            title="Editar Dados Gerais"
                            className="p-1.5 bg-[#2B2D31] hover:bg-[#35373C] text-white rounded transition cursor-pointer"
                            id={`btn-edit-${member.id}`}
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Quick Maker Add button */}
                          <button
                            onClick={() => openMakerModal(member)}
                            title="Adicionar Maker"
                            className="p-1.5 bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-[#5865f2] rounded transition cursor-pointer"
                            id={`btn-addmaker-${member.id}`}
                          >
                            <PlusCircle size={14} />
                          </button>

                          {/* Quick Warning Add button */}
                          <button
                            onClick={() => openWarningModal(member)}
                            title="Aplicar Warning"
                            className="p-1.5 bg-[#f0b232]/10 hover:bg-[#f0b232]/20 text-[#f0b232] rounded transition cursor-pointer"
                            id={`btn-warn-${member.id}`}
                          >
                            <AlertTriangle size={14} />
                          </button>

                          {/* Toggle active status */}
                          <button
                            onClick={() => toggleMemberStatus(member)}
                            title={member.status === 'Active' ? 'Desativar (Marcar Inativo)' : 'Ativar (Marcar Ativo)'}
                            className={`p-1.5 rounded transition cursor-pointer ${
                              member.status === 'Active' 
                                ? 'bg-[#f23f43]/10 hover:bg-[#f23f43]/20 text-[#f23f43]' 
                                : 'bg-[#23a55a]/10 hover:bg-[#23a55a]/20 text-[#23a55a]'
                            }`}
                            id={`btn-status-${member.id}`}
                          >
                            {member.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD MEMBER */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#2B2D31] border border-[#1E1F22] rounded-xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
              id="add-member-modal"
            >
              {/* Colored top accent line */}
              <div className="h-1.5 bg-[#5865f2] w-full" />

              {/* Modal header */}
              <div className="p-5 border-b border-[#1E1F22] flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight flex items-center gap-2">
                  <PlusCircle size={20} className="text-[#5865f2]" />
                  Cadastrar Novo Membro
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-[#949ba4] hover:text-white transition text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAddMember} className="overflow-y-auto flex-1 p-6 space-y-5">
                {errorMsg && (
                  <div className="p-3.5 bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle size={16} /> <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="p-3.5 bg-[#23a55a]/10 border border-[#23a55a]/20 text-[#23a55a] rounded-lg text-xs flex items-center gap-2 animate-bounce">
                    <Check size={16} /> <span>{successMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Character Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Nome do Main (Único)
                    </label>
                    <input
                      type="text"
                      required
                      value={newMain}
                      onChange={(e) => setNewMain(e.target.value)}
                      placeholder="Ex: Kharsek"
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  {/* TeamSpeak Nickname */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Nick do TeamSpeak
                    </label>
                    <input
                      type="text"
                      value={newTsNick}
                      onChange={(e) => setNewTsNick(e.target.value)}
                      placeholder="Ex: Kharsek [TS]"
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  {/* Join Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Data de Entrada
                    </label>
                    <input
                      type="date"
                      required
                      value={newJoinDate}
                      onChange={(e) => setNewJoinDate(e.target.value)}
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  {/* Responsible Leader */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Líder Responsável
                    </label>
                    <select
                      value={newLeader}
                      onChange={(e) => setNewLeader(e.target.value)}
                      disabled={currentUser.role === 'Líder'}
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {currentUser.role === 'Líder' ? (
                        <option value={currentUser.username}>{currentUser.username} (Líder)</option>
                      ) : (
                        users.map(u => (
                          <option key={u.id} value={u.username}>{u.username} ({u.role})</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Observações Internas
                  </label>
                  <textarea
                    rows={3}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Adicione observações de estratégia, guilds anteriores, etc."
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] resize-none"
                  />
                </div>

                {/* Makers Iniciais */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Makers Iniciais (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewInitialMakers([...newInitialMakers, { name: '', level: '', isManual: false }])}
                      className="text-xs text-[#5865f2] hover:text-[#4752c4] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle size={14} />
                      Adicionar Maker
                    </button>
                  </div>

                  {newInitialMakers.length === 0 ? (
                    <div className="text-xs text-[#949ba4] bg-[#1E1F22] p-3.5 rounded-lg border border-[#1E1F22] text-center">
                      Nenhum Maker adicionado no momento. Clique em "Adicionar Maker" para inserir personagens secundários com suas metas de level.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {newInitialMakers.map((maker, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 bg-[#1E1F22] rounded-lg border border-[#2B2D31] relative">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-[#949ba4] uppercase">
                              Maker #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...newInitialMakers];
                                updated.splice(idx, 1);
                                setNewInitialMakers(updated);
                              }}
                              className="text-xs text-[#f23f43] hover:text-[#d83c3e] font-semibold cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Nome do Maker"
                              value={maker.name}
                              onChange={(e) => {
                                const updated = [...newInitialMakers];
                                updated[idx].name = e.target.value;
                                setNewInitialMakers(updated);
                              }}
                              className="bg-[#2B2D31] border border-[#2B2D31] rounded-lg py-1.5 px-3 text-xs text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                            />

                            <div className="flex gap-2">
                              <select
                                value={maker.isManual ? 'manual' : maker.level}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...newInitialMakers];
                                  if (val === 'manual') {
                                    updated[idx].isManual = true;
                                    updated[idx].level = '';
                                  } else {
                                    updated[idx].isManual = false;
                                    updated[idx].level = val;
                                  }
                                  setNewInitialMakers(updated);
                                }}
                                className="flex-1 bg-[#2B2D31] border border-[#2B2D31] rounded-lg py-1.5 px-2 text-xs text-[#f2f3f5] focus:outline-none cursor-pointer"
                              >
                                <option value="">Sem Meta Inicial</option>
                                <option value="250">Meta: 250</option>
                                <option value="350">Meta: 350</option>
                                <option value="450">Meta: 450</option>
                                <option value="500">Meta: 500</option>
                                <option value="550">Meta: 550</option>
                                <option value="600">Meta: 600</option>
                                <option value="manual">Digitar Manualmente...</option>
                              </select>

                              {maker.isManual && (
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: 650"
                                  value={maker.level}
                                  onChange={(e) => {
                                    const updated = [...newInitialMakers];
                                    updated[idx].level = e.target.value;
                                    setNewInitialMakers(updated);
                                  }}
                                  className="w-24 bg-[#2B2D31] border border-[#2B2D31] rounded-lg py-1.5 px-2 text-xs text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quest Accesses checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Acessos Quests Conquistados
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#1E1F22] p-4 rounded-lg border border-[#1E1F22]">
                    {accessTypes.map((type) => (
                      <label 
                        key={type.id} 
                        className="flex items-center gap-3 text-xs font-medium text-[#dbdee1] select-none cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={newAccess[type.id] || false}
                          onChange={(e) => setNewAccess({
                            ...newAccess,
                            [type.id]: e.target.checked
                          })}
                          className="w-4.5 h-4.5 rounded border-[#1E1F22] text-[#5865f2] focus:ring-[#5865f2] focus:ring-1 focus:ring-offset-0 bg-[#2B2D31]"
                        />
                        <span>{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E1F22]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-[#1E1F22] hover:bg-[#35373C] text-[#dbdee1] font-semibold py-2 px-4 rounded-lg text-sm transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2 px-5 rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Membro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT MEMBER */}
      <AnimatePresence>
        {showEditModal && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#2B2D31] border border-[#1E1F22] rounded-xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
              id="edit-member-modal"
            >
              <div className="h-1.5 bg-[#f0b232] w-full" />

              <div className="p-5 border-b border-[#1E1F22] flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight flex items-center gap-2">
                  <Edit2 size={18} className="text-[#f0b232]" />
                  Editar Membro: <span className="text-[#f0b232]">{selectedMember.main}</span>
                </h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-[#949ba4] hover:text-white transition text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditMember} className="overflow-y-auto flex-1 p-6 space-y-5">
                {errorMsg && (
                  <div className="p-3.5 bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle size={16} /> <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="p-3.5 bg-[#23a55a]/10 border border-[#23a55a]/20 text-[#23a55a] rounded-lg text-xs flex items-center gap-2">
                    <Check size={16} /> <span>{successMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Character Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Nome do Main (Único)
                    </label>
                    <input
                      type="text"
                      required
                      value={editMain}
                      onChange={(e) => setEditMain(e.target.value)}
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  {/* TeamSpeak Nickname */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Nick do TeamSpeak
                    </label>
                    <input
                      type="text"
                      value={editTsNick}
                      onChange={(e) => setEditTsNick(e.target.value)}
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  {/* Join Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Data de Entrada
                    </label>
                    <input
                      type="date"
                      required
                      value={editJoinDate}
                      onChange={(e) => setEditJoinDate(e.target.value)}
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  {/* Responsible Leader */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Líder Responsável
                    </label>
                    <select
                      value={editLeader}
                      onChange={(e) => setEditLeader(e.target.value)}
                      disabled={currentUser.role === 'Líder'}
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {currentUser.role === 'Líder' ? (
                        <option value={editLeader}>{editLeader} (Líder)</option>
                      ) : (
                        users.map(u => (
                          <option key={u.id} value={u.username}>{u.username} ({u.role})</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Active / Inactive Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                      Status do Membro
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e: any) => setEditStatus(e.target.value)}
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] cursor-pointer"
                    >
                      <option value="Active">Ativo</option>
                      <option value="Inactive">Inativo</option>
                    </select>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Observações Internas
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] resize-none"
                  />
                </div>

                {/* Quest Accesses checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Acessos Quests Conquistados
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#1E1F22] p-4 rounded-lg border border-[#1E1F22]">
                    {accessTypes.map((type) => (
                      <label 
                        key={type.id} 
                        className="flex items-center gap-3 text-xs font-medium text-[#dbdee1] select-none cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={editAccess[type.id] || false}
                          onChange={(e) => setEditAccess({
                            ...editAccess,
                            [type.id]: e.target.checked
                          })}
                          className="w-4.5 h-4.5 rounded border-[#1E1F22] text-[#5865f2] focus:ring-[#5865f2] bg-[#2B2D31]"
                        />
                        <span>{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Inline Makers & Level Goals management inside Edit Modal */}
                {(() => {
                  const currentMember = dbState.members.find(m => m.id === selectedMember.id) || selectedMember;
                  return (
                    <div className="space-y-4 border-t border-[#1E1F22] pt-5" id="edit-member-makers-section">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                          Makers e Metas de Level do Membro
                        </label>
                        <span className="text-[10px] text-[#949ba4] font-medium bg-[#1E1F22] px-2 py-1 rounded border border-[#1E1F22]">
                          Total: {currentMember.makers.length} makers
                        </span>
                      </div>

                      {/* Existing Makers List */}
                      {currentMember.makers.length === 0 ? (
                        <div className="text-center py-5 bg-[#1E1F22] rounded-lg border border-dashed border-[#1E1F22]/40 text-[#949ba4] text-xs">
                          Nenhum Maker cadastrado para este membro.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2.5 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#949ba4]">
                            <div className="flex items-center justify-center w-6 shrink-0" title="Excluir Maker">
                              <Trash2 size={12} className="text-[#f23f43]" />
                            </div>
                            <span>Nome do Maker / Metas de Level</span>
                          </div>
                          {currentMember.makers.map((mk) => {
                            const latestGoal = mk.levelGoals.length > 0 ? mk.levelGoals[mk.levelGoals.length - 1].goal : 'Nenhuma';
                            const isMarkedForDelete = makersToDelete.includes(mk.id);

                            return (
                              <div key={mk.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1E1F22] p-3 rounded-lg border ${isMarkedForDelete ? 'border-[#f23f43]/70 bg-[#f23f43]/5' : 'border-[#1E1F22]'} transition-all`} id={`edit-maker-row-${mk.id}`}>
                                <div className="flex items-center gap-2.5">
                                  <label className="flex items-center justify-center cursor-pointer p-1 rounded hover:bg-[#2B2D31] shrink-0" title="Marcar para excluir ao salvar">
                                    <input
                                      type="checkbox"
                                      checked={isMarkedForDelete}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setMakersToDelete([...makersToDelete, mk.id]);
                                        } else {
                                          setMakersToDelete(makersToDelete.filter(id => id !== mk.id));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-[#2B2D31] text-[#f23f43] focus:ring-[#f23f43] bg-[#2B2D31] cursor-pointer"
                                    />
                                  </label>
                                  <div className="w-8 h-8 rounded-lg bg-[#5865f2]/10 border border-[#5865f2]/20 flex items-center justify-center text-xs font-bold text-[#5865f2] uppercase shrink-0">
                                    {mk.name.substring(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className={`text-xs font-bold block ${isMarkedForDelete ? 'text-[#f23f43] line-through opacity-70' : 'text-white'}`}>{mk.name}</span>
                                    <span className="text-[10px] text-[#949ba4] font-mono mt-0.5 block">
                                      Level / Meta Atual: <strong className="text-white font-semibold">{latestGoal}</strong>
                                      {isMarkedForDelete && (
                                        <span className="text-[#f23f43] font-bold ml-2">(Excluir ao Salvar)</span>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                  {addingLevelForMakerId === mk.id ? (
                                    <div className="flex items-center gap-1.5 bg-[#2B2D31] p-1 rounded-md border border-[#35373C]">
                                      <select
                                        value={newLevelGoalValue}
                                        onChange={(e) => setNewLevelGoalValue(e.target.value)}
                                        className="bg-[#1E1F22] text-[11px] text-white rounded px-1.5 py-0.5 focus:outline-none border border-[#1E1F22] cursor-pointer"
                                      >
                                        <option value="250+">250+</option>
                                        <option value="500+">500+</option>
                                        <option value="550+">550+</option>
                                        <option value="600+">600+</option>
                                        <option value="custom">Outro...</option>
                                      </select>

                                      {newLevelGoalValue === 'custom' && (
                                        <input
                                          type="text"
                                          placeholder="Ex: 580+"
                                          value={customLevelGoalValue}
                                          onChange={(e) => setCustomLevelGoalValue(e.target.value)}
                                          className="w-14 bg-[#1E1F22] border border-[#1E1F22] rounded px-1 py-0.5 text-[11px] text-white focus:outline-none"
                                        />
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleAddGoalToMakerLocal(currentMember.id, mk.id)}
                                        className="bg-[#23a55a] hover:bg-[#1a7f43] text-white px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition"
                                      >
                                        Ok
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAddingLevelForMakerId(null)}
                                        className="text-[#949ba4] hover:text-white px-1 py-0.5 text-[10px] cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingLevelForMakerId(mk.id);
                                        setNewLevelGoalValue('250+');
                                        setCustomLevelGoalValue('');
                                      }}
                                      className="bg-[#5865f2]/10 hover:bg-[#5865f2]/25 text-[#5865f2] border border-[#5865f2]/15 py-1 px-2.5 rounded-md text-[10px] font-bold cursor-pointer transition uppercase tracking-wider"
                                    >
                                      + Meta Level
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Maker block inline */}
                      <div className="bg-[#1E1F22] p-3.5 rounded-lg border border-[#1E1F22] space-y-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#b5bac1] block">
                          Adicionar Novo Maker
                        </span>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                          <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#949ba4]">
                              Nome do Maker
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Kharsek Maker"
                              value={localMakerName}
                              onChange={(e) => setLocalMakerName(e.target.value)}
                              className="w-full bg-[#2B2D31] border border-[#2B2D31] rounded-lg py-1.5 px-3 text-xs text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                            />
                          </div>

                          <div className="w-full sm:w-40 space-y-1">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#949ba4]">
                              Level Inicial
                            </label>
                            <select
                              value={localMakerLevel}
                              onChange={(e) => setLocalMakerLevel(e.target.value)}
                              className="w-full bg-[#2B2D31] border border-[#2B2D31] rounded-lg py-1.5 px-3 text-xs text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] cursor-pointer"
                            >
                              <option value="none">Sem meta inicial</option>
                              <option value="250+">250+</option>
                              <option value="500+">500+</option>
                              <option value="550+">550+</option>
                              <option value="600+">600+</option>
                              <option value="custom">Outro...</option>
                            </select>
                          </div>

                          {localMakerLevel === 'custom' && (
                            <div className="w-full sm:w-28 space-y-1">
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#949ba4]">
                                Level
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: 580+"
                                value={localCustomLevel}
                                onChange={(e) => setLocalCustomLevel(e.target.value)}
                                className="w-full bg-[#2B2D31] border border-[#2B2D31] rounded-lg py-1.5 px-3 text-xs text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleAddMakerLocal(currentMember.id)}
                            className="bg-[#23a55a] hover:bg-[#1a7f43] text-white font-extrabold py-2 px-3.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 self-stretch sm:self-auto h-[32px] uppercase tracking-wider"
                          >
                            <PlusCircle size={14} /> Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E1F22]">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="bg-[#1E1F22] hover:bg-[#35373C] text-[#dbdee1] font-semibold py-2 px-4 rounded-lg text-sm transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2 px-5 rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ADD MAKER */}
      <AnimatePresence>
        {showMakerModal && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#2B2D31] border border-[#1E1F22] rounded-xl overflow-hidden shadow-2xl relative"
              id="add-maker-modal"
            >
              <div className="h-1.5 bg-[#5865f2] w-full" />

              <div className="p-5 border-b border-[#1E1F22] flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white uppercase tracking-tight">
                  Adicionar Maker para: <span className="text-[#5865f2]">{selectedMember.main}</span>
                </h3>
                <button 
                  onClick={() => setShowMakerModal(false)}
                  className="text-[#949ba4] hover:text-white transition font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMaker} className="p-6 space-y-4">
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Nome do Personagem Maker (Único)
                  </label>
                  <input
                    type="text"
                    required
                    value={makerName}
                    onChange={(e) => setMakerName(e.target.value)}
                    placeholder="Ex: Kharsek Maker"
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                  />
                  <span className="text-[10px] text-[#949ba4] block">
                    O sistema verificará se o personagem já existe como Main ou Maker de outro membro.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E1F22]">
                  <button
                    type="button"
                    onClick={() => setShowMakerModal(false)}
                    className="bg-[#1E1F22] hover:bg-[#35373C] text-[#dbdee1] font-semibold py-1.5 px-3.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adicionando...' : 'Adicionar Maker'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: ADD WARNING */}
      <AnimatePresence>
        {showWarningModal && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#2B2D31] border border-[#1E1F22] rounded-xl overflow-hidden shadow-2xl relative"
              id="add-warning-modal"
            >
              <div className="h-1.5 bg-[#f0b232] w-full" />

              <div className="p-5 border-b border-[#1E1F22] flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white uppercase tracking-tight">
                  Aplicar Warning em: <span className="text-[#f0b232]">{selectedMember.main}</span>
                </h3>
                <button 
                  onClick={() => setShowWarningModal(false)}
                  className="text-[#949ba4] hover:text-white transition font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddWarning} className="p-6 space-y-4">
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                    Motivo do Warning / Advertência
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={warningReason}
                    onChange={(e) => setWarningReason(e.target.value)}
                    placeholder="Ex: Ausente na War de domingo sem dar justificativa ou avisar previamente."
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2] resize-none"
                  />
                  <span className="text-[10px] text-[#949ba4] block">
                    Responsável: <strong className="text-white">{currentUser.username}</strong>. Apenas você ou Administradores poderão remover esta advertência futuramente.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E1F22]">
                  <button
                    type="button"
                    onClick={() => setShowWarningModal(false)}
                    className="bg-[#1E1F22] hover:bg-[#35373C] text-[#dbdee1] font-semibold py-1.5 px-3.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#f0b232] hover:bg-[#d69922] text-black font-bold py-1.5 px-4 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Aplicando...' : 'Aplicar Advertência'}
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
