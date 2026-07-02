import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Users, User, Clock, AlertTriangle, CheckCircle2, Star, Plus, 
  Trash2, Edit, Calendar, BookOpen, Key, Trash, ChevronRight, CornerDownRight, PlusCircle
} from 'lucide-react';
import { Member, Maker, Warning, User as SystemUser, HistoryLog, DatabaseState } from '../types';
import { auditMember } from '../lib/audit';

interface MemberProfileModalProps {
  memberId: string;
  dbState: DatabaseState;
  currentUser: SystemUser;
  onClose: () => void;
  onRefresh: () => void;
}

export default function MemberProfileModal({
  memberId,
  dbState,
  currentUser,
  onClose,
  onRefresh,
}: MemberProfileModalProps) {
  const { members, history, accessTypes } = dbState;
  const member = members.find((m) => m.id === memberId);
  const audit = member ? auditMember(member, dbState.globalGoals) : { hasWarnings: false, missingAccesses: [], belowLevelMakers: [], noMakers: false };

  // States
  const [activeTab, setActiveTab] = useState<'overview' | 'makers' | 'warnings' | 'logs'>('overview');
  
  // Maker action states
  const [editingMaker, setEditingMaker] = useState<Maker | null>(null);
  const [editMakerName, setEditMakerName] = useState('');
  const [addingGoalMaker, setAddingGoalMaker] = useState<Maker | null>(null);
  const [newGoal, setNewGoal] = useState('250+'); // Default
  const [manualGoalValue, setManualGoalValue] = useState('');

  // Common messaging
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (!member) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#2B2D31] p-6 rounded-xl text-center space-y-4 max-w-sm border border-[#1E1F22]">
          <p className="text-white font-medium">Membro não encontrado.</p>
          <button onClick={onClose} className="bg-[#5865f2] text-white py-2 px-4 rounded cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Filter logs relevant to this member or their makers
  const memberLogs = history.filter((log) => {
    const mainLower = member.main.toLowerCase();
    const matchesMain = log.details.toLowerCase().includes(mainLower);
    const matchesMakers = member.makers.some((mk) =>
      log.details.toLowerCase().includes(mk.name.toLowerCase())
    );
    return matchesMain || matchesMakers;
  });

  // Warnings lists
  const activeWarnings = member.warnings.filter((w) => !w.removed);
  const removedWarnings = member.warnings.filter((w) => w.removed);

  // Maker dynamic goals increment logic
  const getGoalSuggestions = (maker: Maker) => {
    // Basic standard goals as requested: 250, 350, 450, 500, 550, 600
    const baseGoals = ['250+', '350+', '450+', '500+', '550+', '600+'];
    
    // Filter out goals the maker already achieved
    const achievedGoals = maker.levelGoals.map(g => g.goal);
    return baseGoals.filter(s => !achievedGoals.includes(s));
  };

  // Action: Remove Warning
  const handleRemoveWarning = async (warningId: string) => {
    if (!confirm('Deseja realmente remover esta advertência?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch(`/api/members/${member.id}/warnings/${warningId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          userRole: currentUser.role,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao remover Warning.');
      }

      setSuccessMsg('Warning removido com sucesso!');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de comunicação.');
    }
  };

  // Action: Rename Maker
  const handleRenameMaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaker || !editMakerName.trim()) return;
    setIsActionLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/members/${member.id}/makers/${editingMaker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editMakerName.trim(),
          username: currentUser.username,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao renomear Maker.');
      }

      setSuccessMsg('Maker renomeado com sucesso!');
      setEditingMaker(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Action: Delete Maker
  const handleDeleteMaker = async (makerId: string, makerName: string) => {
    if (!confirm(`Tem certeza de que deseja remover o Maker "${makerName}" definitivamente?`)) return;
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/members/${member.id}/makers/${makerId}?username=${encodeURIComponent(currentUser.username)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.message || 'Erro ao remover Maker.');
      }

      setSuccessMsg('Maker removido com sucesso!');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Action: Add Goal evolution
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingGoalMaker) return;

    let finalGoal = newGoal;
    if (newGoal === 'manual') {
      const trimmed = manualGoalValue.trim();
      if (!trimmed) {
        setErrorMsg('Por favor, digite o level do Maker.');
        return;
      }
      // If it's just a number, append "+" for consistency, e.g. "650+"
      finalGoal = /^\d+$/.test(trimmed) ? `${trimmed}+` : trimmed;
    }

    setIsActionLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/members/${member.id}/makers/${addingGoalMaker.id}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: finalGoal,
          username: currentUser.username,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar meta.');
      }

      setSuccessMsg(`Meta "${finalGoal}" registrada com sucesso!`);
      setAddingGoalMaker(null);
      setManualGoalValue('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-[#2B2D31] border border-[#1E1F22] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col h-[85vh]"
        id="member-profile-modal"
      >
        {/* Banner Line Accent */}
        <div className="h-2 bg-gradient-to-r from-[#5865f2] via-[#a370f7] to-[#23a55a] w-full" />

        {/* Profile Header Block */}
        <div className="p-6 bg-[#1E1F22] border-b border-[#1E1F22]" id="profile-modal-header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#5865f2]/15 border border-[#5865f2]/30 rounded-2xl flex items-center justify-center font-display font-bold text-2xl text-[#5865f2] shadow-inner">
                {member.main.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display font-black text-xl text-white tracking-tight">
                    {member.main}
                  </h2>
                  <span className={`text-[10px] px-2.5 py-0.5 font-extrabold uppercase rounded-full ${
                    member.status === 'Active' ? 'bg-[#23a55a]/15 text-[#23a55a]' : 'bg-[#f23f43]/15 text-[#f23f43]'
                  }`}>
                    {member.status === 'Active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-xs text-[#949ba4] mt-1 font-sans">
                  Nick TS: <strong className="text-[#dbdee1] font-medium">{member.tsNick || 'Sem TS'}</strong> 
                  <span className="mx-2">•</span> 
                  Líder Responsável: <strong className="text-[#dbdee1] font-medium">{member.responsibleLeader}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2B2D31] hover:bg-[#35373C] text-white font-semibold rounded-lg text-xs transition cursor-pointer self-start md:self-auto"
            >
              Fechar Painel
            </button>
          </div>

          {/* Navigation Tabs (Discord channel style bar) */}
          <div className="flex gap-2.5 mt-6 border-t border-[#1E1F22] pt-4 overflow-x-auto" id="profile-tabs">
            {[
              { id: 'overview', label: 'Dados Gerais', icon: BookOpen },
              { id: 'makers', label: `Makers (${member.makers.length})`, icon: Users },
              { id: 'warnings', label: `Warnings (${activeWarnings.length})`, icon: AlertTriangle },
              { id: 'logs', label: `Histórico (${memberLogs.length})`, icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition cursor-pointer ${
                    isActive
                      ? 'bg-[#5865f2] text-white'
                      : 'text-[#949ba4] hover:bg-[#35373C] hover:text-[#dbdee1]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6" id="profile-modal-body">
          
          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle size={16} /> <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-[#23a55a]/10 border border-[#23a55a]/20 text-[#23a55a] rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 size={16} /> <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW / DADOS GERAIS */}
          {activeTab === 'overview' && (
            <div className="space-y-6" id="tab-overview-content">
              {/* Global Goals Warning Block */}
              {audit.hasWarnings && (
                <div className="bg-[#f0b232]/10 border border-[#f0b232]/30 rounded-xl p-4 flex gap-3 text-xs" id="global-goals-warning-banner">
                  <AlertTriangle className="text-[#f0b232] shrink-0 mt-0.5 animate-pulse" size={18} />
                  <div className="space-y-1">
                    <span className="font-bold text-white uppercase tracking-wider block">⚠️ Requisitos Globais Pendentes</span>
                    <p className="text-[#b5bac1]">Este membro possui as seguintes pendências com relação às metas ativas do servidor:</p>
                    <ul className="list-disc pl-4 space-y-1 mt-1.5 text-[#dbdee1] font-medium">
                      {audit.missingAccesses.map(access => (
                        <li key={access}>Falta acesso à quest: <strong className="text-white">{access}</strong></li>
                      ))}
                      {audit.noMakers && (
                        <li>Nenhum Maker cadastrado (Exige pelo menos um de level <strong className="text-white">{dbState.globalGoals?.makerLevel}</strong>)</li>
                      )}
                      {audit.belowLevelMakers.map(maker => (
                        <li key={maker.name}>Maker abaixo do level exigido: <strong className="text-white">{maker.name}</strong> (Level {maker.currentLevel} / Meta {maker.targetLevel}+)</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Card: Acessos */}
                <div className="discord-card rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-2">
                    <Key size={14} className="text-[#5865f2]" />
                    Acessos de Quests
                  </h3>

                  <div className="space-y-3">
                    {accessTypes.map((type) => {
                      const hasAccess = !!member.access[type.id];
                      return (
                        <div key={type.id} className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-[#1E1F22]">
                          <span className="font-semibold text-xs text-[#dbdee1]">{type.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            hasAccess 
                              ? 'bg-[#23a55a]/15 text-[#23a55a] border border-[#23a55a]/25' 
                              : 'bg-[#f23f43]/15 text-[#f23f43] border border-[#f23f43]/25'
                          }`}>
                            {hasAccess ? 'Liberado' : 'Sem Acesso'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Card: Metadata */}
                <div className="discord-card rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-2">
                    <Calendar size={14} className="text-[#23a55a]" />
                    Cronologia do Membro
                  </h3>

                  <div className="space-y-3.5 text-xs text-[#b5bac1]">
                    <div className="flex justify-between border-b border-[#1E1F22] pb-2">
                      <span>Data de Entrada:</span>
                      <strong className="text-white font-mono">{member.joinDate}</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#1E1F22] pb-2">
                      <span>Cadastrado em:</span>
                      <strong className="text-white font-mono">{new Date(member.createdAt).toLocaleString('pt-BR')}</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#1E1F22] pb-2">
                      <span>Última alteração:</span>
                      <strong className="text-white font-mono">{new Date(member.updatedAt).toLocaleString('pt-BR')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Warnings Ativos:</span>
                      <strong className={`${activeWarnings.length > 0 ? 'text-[#f23f43]' : 'text-[#23a55a]'} font-bold`}>
                        {activeWarnings.length}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes block */}
              <div className="discord-card rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-2">
                  <BookOpen size={14} className="text-[#f0b232]" />
                  Observações de Liderança
                </h3>
                <div className="bg-[#1E1F22] p-4 rounded-lg border border-[#1E1F22] min-h-[80px]">
                  {member.notes ? (
                    <p className="text-xs text-[#dbdee1] leading-relaxed whitespace-pre-wrap">{member.notes}</p>
                  ) : (
                    <p className="text-xs text-[#949ba4] italic">Nenhuma observação interna registrada.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MAKERS & METAS EVOLUTION */}
          {activeTab === 'makers' && (
            <div className="space-y-6" id="tab-makers-content">
              
              {/* Dynamic sub-forms inside modal */}
              {editingMaker && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-[#1E1F22] border border-[#f0b232]/30 p-4 rounded-xl space-y-3"
                >
                  <p className="text-xs font-bold text-[#f0b232] uppercase">Renomear Maker: {editingMaker.name}</p>
                  <form onSubmit={handleRenameMaker} className="flex gap-3">
                    <input
                      type="text"
                      required
                      value={editMakerName}
                      onChange={(e) => setEditMakerName(e.target.value)}
                      className="flex-1 bg-[#2B2D31] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#f0b232]"
                    />
                    <button type="submit" disabled={isActionLoading} className="bg-[#f0b232] hover:bg-[#d69922] text-black font-bold py-2 px-4 rounded-lg text-xs cursor-pointer">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setEditingMaker(null)} className="bg-[#2B2D31] text-[#dbdee1] py-2 px-3 rounded-lg text-xs cursor-pointer">
                      Cancelar
                    </button>
                  </form>
                </motion.div>
              )}

              {addingGoalMaker && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-[#1E1F22] border border-[#5865f2]/30 p-4 rounded-xl space-y-3"
                >
                  <p className="text-xs font-bold text-[#5865f2] uppercase">Registrar Evolução de Meta: {addingGoalMaker.name}</p>
                  <form onSubmit={handleAddGoal} className="space-y-3">
                    <div className="flex flex-col md:flex-row gap-3">
                      <select
                        value={newGoal}
                        onChange={(e) => {
                          setNewGoal(e.target.value);
                          if (e.target.value !== 'manual') {
                            setManualGoalValue('');
                          }
                        }}
                        className="flex-1 bg-[#2B2D31] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none cursor-pointer"
                      >
                        {getGoalSuggestions(addingGoalMaker).map((goal) => (
                          <option key={goal} value={goal}>{goal}</option>
                        ))}
                        <option value="manual">Level Personalizado (Manual)...</option>
                      </select>

                      {newGoal === 'manual' && (
                        <input
                          type="text"
                          required
                          value={manualGoalValue}
                          onChange={(e) => setManualGoalValue(e.target.value)}
                          placeholder="Digite o Level (Ex: 620, 650, 700)"
                          className="flex-1 bg-[#2B2D31] border border-[#1E1F22] rounded-lg py-2 px-3 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                        />
                      )}
                      
                      <div className="flex gap-2 shrink-0">
                        <button 
                          type="submit" 
                          disabled={isActionLoading || (newGoal === 'manual' && !manualGoalValue.trim())} 
                          className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer"
                        >
                          Confirmar Meta
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAddingGoalMaker(null);
                            setManualGoalValue('');
                          }} 
                          className="bg-[#2B2D31] text-[#dbdee1] py-2 px-3 rounded-lg text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#949ba4]">
                      Selecione uma meta padrão ou insira um level manualmente (ideal para levels maiores que 600). O histórico registrará data, hora e seu login.
                    </p>
                  </form>
                </motion.div>
              )}

              {/* Makers List */}
              {member.makers.length === 0 ? (
                <div className="text-center py-10 bg-[#1E1F22] rounded-xl border border-[#1E1F22] text-[#949ba4]">
                  <p className="text-sm">Nenhum Maker cadastrado para este membro ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="makers-grid">
                  {member.makers.map((maker) => {
                    // Sort goals history chronologically descending to show latest first
                    const sortedGoals = [...maker.levelGoals].sort((a, b) => {
                      const numA = parseInt(a.goal.replace('+', ''), 10) || 0;
                      const numB = parseInt(b.goal.replace('+', ''), 10) || 0;
                      return numB - numA;
                    });
                    
                    return (
                      <div key={maker.id} className="discord-card rounded-xl p-5 space-y-4 flex flex-col justify-between" id={`maker-card-${maker.id}`}>
                        <div>
                          {/* Title and top buttons */}
                          <div className="flex items-center justify-between border-b border-[#1E1F22] pb-2.5">
                            <h4 className="font-bold text-sm text-white flex items-center gap-1.5 font-display">
                              <Star size={14} className="text-[#5865f2] fill-[#5865f2]/10" />
                              {maker.name}
                            </h4>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingMaker(maker);
                                  setEditMakerName(maker.name);
                                  setAddingGoalMaker(null);
                                }}
                                title="Renomear Maker"
                                className="p-1 hover:bg-[#35373C] text-[#949ba4] hover:text-white rounded transition cursor-pointer"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMaker(maker.id, maker.name)}
                                title="Excluir Maker"
                                className="p-1 hover:bg-[#f23f43]/15 text-[#949ba4] hover:text-[#f23f43] rounded transition cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Level Goals evolution list */}
                          <div className="space-y-2.5 mt-3">
                            <p className="text-[10px] font-extrabold text-[#949ba4] uppercase tracking-wider">Histórico de Metas</p>
                            
                            {sortedGoals.length === 0 ? (
                              <p className="text-xs text-[#949ba4] italic py-2">Nenhuma meta alcançada registrada ainda.</p>
                            ) : (
                              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {sortedGoals.map((g, idx) => (
                                  <div key={g.id} className="flex items-center justify-between text-xs bg-[#1E1F22] p-2 rounded border border-[#1E1F22]">
                                    <span className="font-bold text-[#23a55a] font-mono flex items-center gap-1">
                                      {idx === 0 && <CheckCircle2 size={12} className="text-[#23a55a]" />}
                                      {g.goal}
                                    </span>
                                    <div className="text-right text-[10px] text-[#949ba4]">
                                      <p className="font-semibold text-[#dbdee1]">Registrado por: {g.byUser}</p>
                                      <p className="font-mono">{g.date} {g.time}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Register evolution button */}
                        <button
                          onClick={() => {
                            setAddingGoalMaker(maker);
                            // Auto set first option of suggestions as suggestion, otherwise default to manual
                            const suggs = getGoalSuggestions(maker);
                            if (suggs.length > 0) {
                              setNewGoal(suggs[0]);
                            } else {
                              setNewGoal('manual');
                            }
                            setEditingMaker(null);
                          }}
                          className="w-full bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-[#5865f2] border border-[#5865f2]/20 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-3"
                        >
                          <PlusCircle size={14} />
                          Evoluir Meta de Level
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WARNINGS ADVERTÊNCIAS */}
          {activeTab === 'warnings' && (
            <div className="space-y-6" id="tab-warnings-content">
              
              {/* Warnings Ativos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#f23f43] flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Warnings Ativos ({activeWarnings.length})
                </h4>
                
                {activeWarnings.length === 0 ? (
                  <div className="bg-[#23a55a]/5 border border-[#23a55a]/15 text-[#23a55a] p-4 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Nenhum warning ativo registrado! O membro está com reputação limpa.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeWarnings.map((warn) => (
                      <div key={warn.id} className="p-4 bg-[#f23f43]/5 border border-[#f23f43]/15 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-xs text-white leading-relaxed font-sans font-medium">
                            {warn.reason}
                          </p>
                          <div className="flex gap-3 text-[10px] text-[#949ba4]">
                            <span>Aplicado por: <strong className="text-white">{warn.byLeader}</strong></span>
                            <span>•</span>
                            <span>Data: <strong className="text-white font-mono">{warn.date} {warn.time}</strong></span>
                          </div>
                        </div>

                        {/* Removal button: validation checked on server, but client visual validation */}
                        <div className="shrink-0 flex items-start">
                          <button
                            onClick={() => handleRemoveWarning(warn.id)}
                            className="bg-[#2B2D31] hover:bg-[#f23f43] hover:text-white text-[#f23f43] font-bold py-1.5 px-3 rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Trash size={12} /> Remover Warning
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warnings Removidos (Histórico de Reabilitação) */}
              <div className="space-y-3 pt-4 border-t border-[#1E1F22]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#23a55a]" /> Histórico de Warnings Removidos ({removedWarnings.length})
                </h4>

                {removedWarnings.length === 0 ? (
                  <p className="text-xs text-[#949ba4] italic">Nenhuma advertência removida anteriormente.</p>
                ) : (
                  <div className="space-y-2.5 opacity-75">
                     {removedWarnings.map((warn) => (
                      <div key={warn.id} className="p-3 bg-[#1E1F22] border border-[#1E1F22] rounded-lg">
                        <p className="text-xs text-[#b5bac1] line-through decoration-white/40 italic">
                          {warn.reason}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-[#949ba4] mt-2 border-t border-[#1E1F22] pt-1.5">
                          <span>Criado por: <strong className="text-[#dbdee1]">{warn.byLeader}</strong> ({warn.date})</span>
                          <span>•</span>
                          <span>Removido por: <strong className="text-[#23a55a]">{warn.removedBy}</strong> ({warn.removedDate} às {warn.removedTime})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: COMPREHENSIVE RELEVANT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4 font-sans" id="tab-logs-content">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1.5 mb-2">
                <Clock size={14} /> Registro Geral de Atividades Vinculadas
              </h4>

              {memberLogs.length === 0 ? (
                <p className="text-xs text-[#949ba4] text-center py-8 bg-[#1E1F22] rounded-xl border border-[#1E1F22]">
                  Nenhum registro específico para este membro cadastrado no histórico geral.
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {memberLogs.map((log) => {
                    let actionBadgeColor = 'text-[#5865f2] bg-[#5865f2]/10';
                    if (log.action.includes('WARNING')) actionBadgeColor = 'text-[#f0b232] bg-[#f0b232]/10';
                    if (log.action.includes('REMOÇÃO')) actionBadgeColor = 'text-[#f23f43] bg-[#f23f43]/10';
                    if (log.action.includes('MEMBER_CREATE') || log.action.includes('CADASTRO')) actionBadgeColor = 'text-[#23a55a] bg-[#23a55a]/10';

                    return (
                      <div key={log.id} className="p-3 bg-[#1E1F22] rounded-lg border border-[#1E1F22] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${actionBadgeColor}`}>
                              {log.action}
                            </span>
                            <span className="text-[#949ba4] font-semibold">Responsável: {log.username}</span>
                          </div>
                          <p className="text-[#dbdee1] leading-relaxed">{log.details}</p>
                        </div>
                        <div className="shrink-0 text-left md:text-right text-[10px] text-[#949ba4] font-mono">
                          <p>{log.date}</p>
                          <p>{log.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </motion.div>
    </div>
  );
}
