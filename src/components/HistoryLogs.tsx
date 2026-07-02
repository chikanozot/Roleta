import React, { useState } from 'react';
import { Search, Clock, ShieldAlert, Sparkles, AlertCircle, FileText, Filter } from 'lucide-react';
import { HistoryLog } from '../types';

interface HistoryLogsProps {
  history: HistoryLog[];
}

export default function HistoryLogs({ history }: HistoryLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  // Find unique action types for filter suggestions
  const actionTypes = Array.from(new Set(history.map(h => h.action)));

  // Instant filter & search
  const filteredLogs = history.filter(log => {
    // 1. Action Filter
    if (actionFilter !== 'All' && log.action !== actionFilter) {
      return false;
    }

    // 2. Search Box
    if (!searchTerm.trim()) return true;

    const query = searchTerm.toLowerCase().trim();
    const actionMatch = log.action.toLowerCase().includes(query);
    const detailsMatch = log.details.toLowerCase().includes(query);
    const userMatch = log.username.toLowerCase().includes(query);
    const dateMatch = log.date.includes(query);
    const timeMatch = log.time.includes(query);

    return actionMatch || detailsMatch || userMatch || dateMatch || timeMatch;
  });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-64px)]" id="history-view">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1E1F22] pb-5" id="history-header">
        <div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight uppercase">
            Histórico de Atividades
          </h1>
          <p className="text-[#949ba4] text-sm font-medium">
            Registro imutável e detalhado de todas as alterações e ações realizadas no painel.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="discord-card rounded-xl p-4 flex flex-col md:flex-row gap-4" id="history-filters-panel">
        
        {/* Instant Search input */}
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949ba4]">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por ação, responsável, detalhes, data ou hora..."
            className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-2.5 pl-11 pr-4 text-sm text-[#f2f3f5] placeholder-[#949ba4] focus:outline-none focus:border-[#5865f2] transition"
            id="history-search-input"
          />
        </div>

        {/* Action Type Filter dropdown */}
        <div className="w-full md:w-64 flex items-center gap-2 bg-[#1E1F22] border border-[#1E1F22] rounded-lg px-3 py-2 text-sm text-[#f2f3f5] focus-within:border-[#5865f2] transition">
          <Filter size={16} className="text-[#949ba4] shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-[#f2f3f5] focus:outline-none cursor-pointer"
            id="history-action-filter"
          >
            <option value="All">Todas as Ações</option>
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs output list */}
      <div className="discord-card rounded-xl p-5 space-y-3" id="history-list-container">
        <div className="flex items-center justify-between text-xs text-[#949ba4] border-b border-[#1E1F22] pb-3" id="history-results-count">
          <span>
            Mostrando <strong className="text-white">{filteredLogs.length}</strong> de <strong className="text-white">{history.length}</strong> registros históricos.
          </span>
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#949ba4] flex items-center gap-1">
            <Clock size={12} className="text-[#23a55a]" />
            Imutável
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-[#949ba4]" id="empty-history">
            Nenhum registro histórico atende aos filtros de busca especificados.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1" id="history-logs-scroll">
            {filteredLogs.map((log) => {
              // Custom colors based on action type
              let colorClasses = 'border-[#1E1F22] bg-[#1E1F22]/30';
              let actionBadgeColor = 'text-[#5865f2] bg-[#5865f2]/10 border-[#5865f2]/20';

              if (log.action.includes('LOGIN')) {
                colorClasses = 'border-[#23a55a]/10 bg-[#23a55a]/2';
                actionBadgeColor = 'text-[#23a55a] bg-[#23a55a]/10 border-[#23a55a]/20';
              } else if (log.action.includes('WARNING') || log.action.includes('ADVERTÊNCIA')) {
                colorClasses = 'border-[#f0b232]/10 bg-[#f0b232]/2';
                actionBadgeColor = 'text-[#f0b232] bg-[#f0b232]/10 border-[#f0b232]/20';
              } else if (log.action.includes('REMOÇÃO') || log.action.includes('DEVOLUÇÃO') || log.action.includes('EXCLUSÃO')) {
                colorClasses = 'border-[#f23f43]/10 bg-[#f23f43]/2';
                actionBadgeColor = 'text-[#f23f43] bg-[#f23f43]/10 border-[#f23f43]/20';
              } else if (log.action.includes('CADASTRO') || log.action.includes('NOVO') || log.action.includes('CRIAR')) {
                colorClasses = 'border-[#23a55a]/10 bg-[#23a55a]/2';
                actionBadgeColor = 'text-[#23a55a] bg-[#23a55a]/10 border-[#23a55a]/20';
              }

              return (
                <div 
                  key={log.id} 
                  className={`p-3 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition duration-150 hover:bg-[#35373C] ${colorClasses}`}
                  id={`log-item-${log.id}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${actionBadgeColor}`}>
                        {log.action}
                      </span>
                      <span className="text-[#dbdee1] font-bold">{log.username}</span>
                    </div>
                    <p className="text-[#dbdee1] leading-relaxed font-sans">{log.details}</p>
                  </div>

                  <div className="shrink-0 text-left md:text-right text-[10px] text-[#949ba4] font-mono leading-tight">
                    <div className="font-semibold text-white">{log.date}</div>
                    <div className="mt-0.5">{log.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
