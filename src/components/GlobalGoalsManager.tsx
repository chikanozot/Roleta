import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Shield, Check, AlertCircle, Save, HelpCircle, Flame, Star, Trophy } from 'lucide-react';
import { User, DatabaseState, GlobalGoals } from '../types';

interface GlobalGoalsManagerProps {
  dbState: DatabaseState;
  currentUser: User;
  onRefresh: () => void;
}

export default function GlobalGoalsManager({ dbState, currentUser, onRefresh }: GlobalGoalsManagerProps) {
  const isLeader = currentUser.role === 'Administrador' || currentUser.role === 'Líder';

  // Local state for form fields
  const [sanguine, setSanguine] = useState(false);
  const [crypt, setCrypt] = useState(false);
  const [dragon, setDragon] = useState(false);
  const [makerLevel, setMakerLevel] = useState('none');
  const [customLevel, setCustomLevel] = useState('');
  const [isManual, setIsManual] = useState(false);

  // Status message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form with dbState on load
  useEffect(() => {
    if (dbState.globalGoals) {
      setSanguine(!!dbState.globalGoals.sanguine);
      setCrypt(!!dbState.globalGoals.crypt);
      setDragon(!!dbState.globalGoals.dragon);
      
      const level = dbState.globalGoals.makerLevel || 'none';
      const cleanLevel = level.replace('+', '');
      const standardLevels = ['none', '250', '350', '450', '500', '550', '600'];
      
      if (standardLevels.includes(cleanLevel)) {
        setMakerLevel(cleanLevel);
        setIsManual(false);
        setCustomLevel('');
      } else if (level !== 'none') {
        setMakerLevel('manual');
        setIsManual(true);
        setCustomLevel(cleanLevel);
      } else {
        setMakerLevel('none');
        setIsManual(false);
        setCustomLevel('');
      }
    }
  }, [dbState.globalGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let finalLevel = makerLevel;
    if (makerLevel === 'manual') {
      const trimmed = customLevel.trim();
      if (!trimmed) {
        setErrorMsg('Por favor, digite o level personalizado para a meta.');
        setIsSubmitting(false);
        return;
      }
      finalLevel = /^\d+$/.test(trimmed) ? `${trimmed}+` : trimmed;
    } else if (makerLevel !== 'none') {
      finalLevel = `${makerLevel}+`;
    }

    try {
      const response = await fetch('/api/global-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sanguine,
          crypt,
          dragon,
          makerLevel: finalLevel,
          username: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao salvar metas globais.');
      }

      setSuccessMsg('Metas Globais salvas e atualizadas com sucesso para toda a guilda!');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current readable goals from dbState directly
  const activeGoals = dbState.globalGoals || {
    sanguine: false,
    crypt: false,
    dragon: false,
    makerLevel: '450+'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className="flex-1 p-6 overflow-y-auto space-y-6 text-[#f2f3f5]"
      id="global-goals-container"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3f4147] pb-4" id="global-goals-header">
        <div>
          <h1 className="font-display font-black text-2xl text-white tracking-tight flex items-center gap-2">
            <Target className="text-[#5865f2]" size={28} />
            Metas Globais da Guilda
          </h1>
          <p className="text-xs text-[#949ba4] mt-1">
            Defina e visualize os requisitos globais mínimos de acesso e level para todos os membros e seus Makers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="global-goals-layout">
        
        {/* Left Card: Current Goals Status Overview */}
        <div className="lg:col-span-5 space-y-4" id="goals-status-column">
          <div className="discord-card rounded-xl p-5 border border-[#1E1F22] bg-[#2B2D31] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#23a55a]/10 rounded-lg text-[#23a55a]">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Metas Ativas no Servidor</h3>
                <p className="text-[10px] text-[#949ba4]">Requisitos que todos os membros devem cumprir</p>
              </div>
            </div>

            <div className="space-y-4 bg-[#1E1F22] p-4 rounded-lg border border-[#1E1F22]">
              {/* Access Check Sanguine */}
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1 rounded-full ${activeGoals.sanguine ? 'bg-[#23a55a]/10 text-[#23a55a]' : 'bg-[#f23f43]/10 text-[#f23f43]'}`}>
                  <Check size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Acesso à Sanguine</h4>
                  <p className="text-xs text-[#949ba4]">
                    {activeGoals.sanguine ? 'Obrigatório para todos os membros.' : 'Opcional / Não exigido globalmente.'}
                  </p>
                </div>
              </div>

              {/* Access Check Crypt */}
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1 rounded-full ${activeGoals.crypt ? 'bg-[#23a55a]/10 text-[#23a55a]' : 'bg-[#f23f43]/10 text-[#f23f43]'}`}>
                  <Check size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Acesso à Crypt</h4>
                  <p className="text-xs text-[#949ba4]">
                    {activeGoals.crypt ? 'Obrigatório para todos os membros.' : 'Opcional / Não exigido globalmente.'}
                  </p>
                </div>
              </div>

              {/* Access Check Dragon */}
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1 rounded-full ${activeGoals.dragon ? 'bg-[#23a55a]/10 text-[#23a55a]' : 'bg-[#f23f43]/10 text-[#f23f43]'}`}>
                  <Check size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Acesso ao Dragãozinho</h4>
                  <p className="text-xs text-[#949ba4]">
                    {activeGoals.dragon ? 'Obrigatório para todos os membros.' : 'Opcional / Não exigido globalmente.'}
                  </p>
                </div>
              </div>

              {/* Maker Level Goal */}
              <div className="flex items-start gap-3 pt-2 border-t border-[#2B2D31]">
                <div className="mt-0.5 p-1 rounded-full bg-[#5865f2]/10 text-[#5865f2]">
                  <Flame size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Meta de Level do Maker</h4>
                  <p className="text-xs text-[#949ba4]">
                    {activeGoals.makerLevel && activeGoals.makerLevel !== 'none' ? (
                      <span>
                        Mínimo de <strong className="text-[#f2f3f5] text-sm">{activeGoals.makerLevel}</strong> para cada Maker cadastrado.
                      </span>
                    ) : (
                      'Nenhum level mínimo exigido globalmente.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#5865f2]/10 rounded-lg p-3 border border-[#5865f2]/20 text-xs text-[#b5bac1] flex gap-2">
              <AlertCircle size={16} className="text-[#5865f2] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Como funciona o alerta?</span>
                Membros com acessos em falta ou que possuam algum personagem Maker com level menor do que a meta ativa receberão um ícone de alerta amarelo (<span className="text-[#f0b232] font-bold">⚠️</span>) no painel de membros principal e no perfil deles, detalhando as pendências de meta.
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Configuration Form (Only Leader / Admins) */}
        <div className="lg:col-span-7" id="goals-config-column">
          <div className="discord-card rounded-xl p-5 border border-[#1E1F22] bg-[#2B2D31] space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#3f4147]">
              <div className="p-2 bg-[#5865f2]/10 rounded-lg text-[#5865f2]">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                  {isLeader ? 'Painel de Configuração' : 'Requisitos da Guilda'}
                </h3>
                <p className="text-[10px] text-[#949ba4]">
                  {isLeader ? 'Atualize as metas globais que o sistema usará para auditar os membros' : 'Apenas Administradores ou Líderes podem alterar as configurações'}
                </p>
              </div>
            </div>

            {/* Notifications */}
            {successMsg && (
              <div className="bg-[#23a55a]/10 border border-[#23a55a]/30 text-[#23a55a] rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in">
                <Check size={16} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-[#f23f43]/10 border border-[#f23f43]/30 text-[#f23f43] rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Checkboxes Area */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
                  Acessos Globais Exigidos (Quests)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Sanguine required checkbox */}
                  <label className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
                    sanguine 
                      ? 'bg-[#23a55a]/5 border-[#23a55a]/30 text-white' 
                      : 'bg-[#1E1F22] border-[#1E1F22] text-[#949ba4] hover:bg-[#2B2D31]/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isLeader}
                      checked={sanguine}
                      onChange={(e) => setSanguine(e.target.checked)}
                      className="rounded text-[#5865f2] focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold block">Sanguine</span>
                      <span className="text-[10px] text-gray-400">Auditar acesso</span>
                    </div>
                  </label>

                  {/* Crypt required checkbox */}
                  <label className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
                    crypt 
                      ? 'bg-[#23a55a]/5 border-[#23a55a]/30 text-white' 
                      : 'bg-[#1E1F22] border-[#1E1F22] text-[#949ba4] hover:bg-[#2B2D31]/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isLeader}
                      checked={crypt}
                      onChange={(e) => setCrypt(e.target.checked)}
                      className="rounded text-[#5865f2] focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold block">Crypt</span>
                      <span className="text-[10px] text-gray-400">Auditar acesso</span>
                    </div>
                  </label>

                  {/* Dragon required checkbox */}
                  <label className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
                    dragon 
                      ? 'bg-[#23a55a]/5 border-[#23a55a]/30 text-white' 
                      : 'bg-[#1E1F22] border-[#1E1F22] text-[#949ba4] hover:bg-[#2B2D31]/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isLeader}
                      checked={dragon}
                      onChange={(e) => setDragon(e.target.checked)}
                      className="rounded text-[#5865f2] focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold block">Dragãozinho</span>
                      <span className="text-[10px] text-gray-400">Auditar acesso</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Maker level area */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
                  Meta Mínima de Level do Maker
                </label>

                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    disabled={!isLeader}
                    value={makerLevel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMakerLevel(val);
                      if (val !== 'manual') {
                        setCustomLevel('');
                      }
                    }}
                    className="flex-1 bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3 text-sm text-[#f2f3f5] focus:outline-none cursor-pointer"
                  >
                    <option value="none">Nenhuma meta de level exigida</option>
                    <option value="250">Level 250+</option>
                    <option value="350">Level 350+</option>
                    <option value="450">Level 450+</option>
                    <option value="500">Level 500+</option>
                    <option value="550">Level 550+</option>
                    <option value="600">Level 600+</option>
                    <option value="manual">Digitar Manualmente (Ex: 650, 700)...</option>
                  </select>

                  {makerLevel === 'manual' && (
                    <input
                      type="text"
                      required
                      disabled={!isLeader}
                      value={customLevel}
                      onChange={(e) => setCustomLevel(e.target.value)}
                      placeholder="Ex: 650"
                      className="w-full md:w-48 bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 px-3.5 text-sm text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  )}
                </div>
                <span className="text-[10px] text-[#949ba4] block">
                  Escolha uma meta de level padrão ou digite uma manualmente. Qualquer Maker que não tenha atingido essa meta receberá um aviso.
                </span>
              </div>

              {/* Submit Button */}
              {isLeader ? (
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-[#5865f2]/50 text-white font-bold py-2.5 px-5 rounded-lg text-xs flex items-center gap-2 cursor-pointer transition duration-150"
                  >
                    <Save size={16} />
                    {isSubmitting ? 'Salvando...' : 'Salvar Metas Globais'}
                  </button>
                </div>
              ) : (
                <div className="bg-[#1E1F22] p-4 rounded-lg text-center text-xs text-[#949ba4] border border-[#1E1F22]">
                  🔒 Apenas usuários com cargos de Líder ou Administrador podem definir novas metas globais.
                </div>
              )}
            </form>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
