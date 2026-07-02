import React, { useState } from 'react';
import { 
  Database, Download, Upload, RefreshCw, CheckCircle, AlertTriangle, 
  HelpCircle, Shield, Plus, Key, Info, HardDrive 
} from 'lucide-react';
import { DatabaseState, User } from '../types';

interface BackupManagerProps {
  dbState: DatabaseState;
  currentUser: User;
  syncStatus: { status: 'synced' | 'local' | 'syncing'; message: string };
  onRefresh: () => void;
  onForceSync: () => void;
}

export default function BackupManager({
  dbState,
  currentUser,
  syncStatus,
  onRefresh,
  onForceSync,
}: BackupManagerProps) {
  const isAdmin = currentUser.role === 'Administrador';

  // State for dynamic access creations
  const [newAccessId, setNewAccessId] = useState('');
  const [newAccessLabel, setNewAccessLabel] = useState('');

  // Backup file inputs
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Action: Download DB JSON
  const handleDownloadBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbState, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `guild_manager_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Arquivo de backup JSON baixado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Falha ao gerar arquivo de download: ' + err.message);
    }
  };

  // Action: Upload DB JSON
  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];

    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    fileReader.onload = async (event) => {
      try {
        const parsedState = JSON.parse(event.target?.result as string);
        
        // Validation schema check
        if (!parsedState.members || !parsedState.users || !parsedState.history) {
          throw new Error('Formato do arquivo de backup inválido. Chaves obrigatórias ausentes.');
        }

        const response = await fetch('/api/db/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: parsedState,
            username: currentUser.username
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Falha ao restaurar dados no servidor.');
        }

        setSuccessMsg('O banco de dados foi completamente restaurado com sucesso!');
        onRefresh();
        
        // Reset file input
        e.target.value = '';

      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar arquivo de backup.');
      } finally {
        setIsLoading(false);
      }
    };

    fileReader.readAsText(file);
  };

  // Action: Add Dynamic Access
  const handleAddAccessType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccessId.trim() || !newAccessLabel.trim()) {
      setErrorMsg('ID do acesso e rótulo de exibição são obrigatórios.');
      return;
    }

    const cleanedId = newAccessId.trim().toLowerCase().replace(/\s+/g, '_');

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/access-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanedId,
          label: newAccessLabel.trim(),
          username: currentUser.username
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar tipo de acesso.');
      }

      setSuccessMsg(`Novo acesso de quest "${newAccessLabel.trim()}" adicionado!`);
      setNewAccessId('');
      setNewAccessLabel('');
      onRefresh();

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-64px)] font-sans" id="backup-view">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1E1F22] pb-5" id="backup-header">
        <div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight uppercase">
            Backup & Configurações de Acesso
          </h1>
          <p className="text-[#949ba4] text-sm font-medium">
            Gerencie persistência de dados em Cloud Run e crie novas chaves dinâmicas de acesso.
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle size={16} /> <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-[#23a55a]/10 border border-[#23a55a]/20 text-[#23a55a] rounded-lg text-xs flex items-center gap-2">
          <CheckCircle size={16} /> <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="backup-bento-grid">
        
        {/* Left Column: Cloud Persistent Cache */}
        <div className="discord-card rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#dbdee1] flex items-center gap-2">
            <HardDrive size={15} className="text-[#5865f2]" />
            Sincronização & Persistência Local-Nuvem
          </h3>

          <div className="p-4 bg-[#1E1F22] border border-[#1E1F22] rounded-lg space-y-3">
            <div className="flex items-start gap-3 text-xs text-[#b5bac1]">
              <Info size={18} className="text-[#f0b232] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-white">Instância Ativa em Contêiner</p>
                <p className="leading-relaxed">
                  Para garantir que nenhum dado de membros, warnings ou metas seja perdido durante reinicializações do servidor Cloud Run, o painel mantém uma cópia criptografada e segura de todo o banco de dados no **localStorage do navegador** de cada Líder ativo.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <button
              onClick={onForceSync}
              className="flex-1 bg-[#1E1F22] hover:bg-[#35373C] text-white border border-[#1E1F22] font-bold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={syncStatus.status === 'syncing' ? 'animate-spin text-[#5865f2]' : ''} />
              Forçar Sincronização Agora
            </button>
            
            <button
              onClick={handleDownloadBackup}
              className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={14} />
              Exportar Backup (.JSON)
            </button>
          </div>

          {/* Import JSON block for admins */}
          {isAdmin && (
            <div className="border-t border-[#1E1F22] pt-4 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4] block">
                Restaurar Banco de Dados via JSON
              </label>
              <div className="relative border border-dashed border-[#1E1F22] hover:border-[#5865f2] rounded-lg p-3 text-center transition">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleUploadBackup}
                  disabled={isLoading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-center gap-2 text-xs text-[#b5bac1]">
                  <Upload size={14} className="text-[#5865f2]" />
                  <span>Selecione ou arraste arquivo de backup .JSON</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Quest Accesses Manager */}
        <div className="discord-card rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#dbdee1] flex items-center gap-2">
            <Key size={15} className="text-[#23a55a]" />
            Estrutura de Acessos à Quests
          </h3>

          <div className="space-y-3.5">
            <p className="text-xs text-[#b5bac1] leading-relaxed">
              Estes são os acessos e permissões que podem ser concedidos a cada membro individualmente no painel de cadastro:
            </p>

            {/* List of active access flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2" id="backup-access-list">
              {dbState.accessTypes.map((type) => (
                <div key={type.id} className="p-2.5 bg-[#1E1F22] border border-[#1E1F22] rounded-lg text-xs flex items-center justify-between">
                  <span className="font-semibold text-white">{type.label}</span>
                  <code className="text-[10px] bg-[#35373C] px-1.5 py-0.5 rounded text-[#949ba4] font-mono">{type.id}</code>
                </div>
              ))}
            </div>

            {/* Form to create new dynamic access */}
            {isAdmin && (
              <form onSubmit={handleAddAccessType} className="border-t border-[#1E1F22] pt-4 space-y-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#f0b232]">
                  Adicionar Novo Tipo de Acesso
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#949ba4] uppercase block">
                      ID Interno (Slug)
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccessId}
                      onChange={(e) => setNewAccessId(e.target.value)}
                      placeholder="Ex: soul_war"
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-1.5 px-3 text-xs text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#949ba4] uppercase block">
                      Rótulo de Exibição (Label)
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccessLabel}
                      onChange={(e) => setNewAccessLabel(e.target.value)}
                      placeholder="Ex: Soul War Quest"
                      className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-1.5 px-3 text-xs text-[#f2f3f5] focus:outline-none focus:border-[#5865f2]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#23a55a] hover:bg-[#1f914f] text-white font-bold py-2 px-4 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus size={14} />
                  Criar Tipo de Acesso
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
