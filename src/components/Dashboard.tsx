import { motion } from 'motion/react';
import { Users, UserX, ShieldAlert, Award, Star, Clock, FileText, UserCheck, Flame, ArrowUpRight } from 'lucide-react';
import { Member, HistoryLog, GoalHistoryItem } from '../types';

interface DashboardProps {
  members: Member[];
  history: HistoryLog[];
  onViewMember: (member: Member) => void;
  onNavigateToMembers?: (preset: {
    searchTerm?: string;
    statusFilter?: 'All' | 'Active' | 'Inactive';
    accessFilter?: string;
    specialFilter?: 'None' | 'WithMakers' | 'WithWarnings';
  }) => void;
}

export default function Dashboard({ members, history, onViewMember, onNavigateToMembers }: DashboardProps) {
  // 1. CALCULATE METRICS
  const totalMains = members.length;
  const activeMembers = members.filter(m => m.status === 'Active');
  const inactiveMembers = members.filter(m => m.status === 'Inactive');
  
  const totalMakers = members.reduce((sum, m) => sum + m.makers.length, 0);
  
  const activeWarningsCount = members.reduce((sum, m) => {
    return sum + m.warnings.filter(w => !w.removed).length;
  }, 0);

  // Acessos Counts
  const sanguineAccessCount = activeMembers.filter(m => m.access.sanguine).length;
  const cryptAccessCount = activeMembers.filter(m => m.access.crypt).length;
  const dragonAccessCount = activeMembers.filter(m => m.access.dragon).length;

  // Let's get the highest goal reached for each Maker
  // Metas count mapping
  const goalsMap: { [key: string]: number } = {
    '250+': 0, '350+': 0, '450+': 0, '500+': 0, '550+': 0, '600+': 0,
    '650+': 0, '700+': 0, '750+': 0, '800+': 0, '850+': 0, '900+': 0,
    '950+': 0, '1000+': 0
  };

  members.forEach(member => {
    member.makers.forEach(maker => {
      if (maker.levelGoals && maker.levelGoals.length > 0) {
        // Find the highest goal for this maker
        const goalsList = maker.levelGoals.map(g => {
          const num = parseInt(g.goal.replace('+', ''), 10) || 0;
          return { original: g.goal, num };
        });
        goalsList.sort((a, b) => b.num - a.num);
        const highestGoal = goalsList[0].original;
        
        if (goalsMap[highestGoal] !== undefined) {
          goalsMap[highestGoal]++;
        } else {
          // Dynamic goal grouping if not pre-mapped
          goalsMap[highestGoal] = 1;
        }
      }
    });
  });

  // Calculate highest meta dynamic range above 1000 dynamically to show beautifully
  const goalsToDisplay = Object.keys(goalsMap)
    .map(key => ({ label: key, count: goalsMap[key] }))
    .filter(g => g.count > 0 || ['250+', '350+', '450+', '500+'].includes(g.label));

  // Get 5 latest registered members
  const latestMembers = [...members]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Get 5 latest logs
  const latestLogs = history.slice(0, 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-64px)]"
      id="dashboard-container"
    >
      {/* Intro Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1E1F22] pb-5" id="dashboard-header">
        <div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight uppercase">
            Visão Geral da Guild
          </h1>
          <p className="text-[#949ba4] text-sm font-medium">
            Painel de controle em tempo real dos membros da Roleta Russa Team.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#23a55a]/10 border border-[#23a55a]/20 px-3 py-1.5 rounded-lg text-xs font-bold text-[#23a55a]" id="server-status">
          <Flame size={14} className="animate-pulse" />
          <span>SERVIDORES ONLINE</span>
        </div>
      </div>

      {/* Grid: Counter Cards (Discord Vibe) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="dashboard-metrics-grid">
        {/* Card 1: Total Members */}
        <motion.div 
          variants={itemVariants} 
          onClick={() => onNavigateToMembers?.({ statusFilter: 'All', specialFilter: 'None', searchTerm: '' })}
          className="discord-card rounded-xl p-5 relative overflow-hidden cursor-pointer hover:bg-[#35373C] hover:border-[#5865f2]/30 transition group border border-transparent" 
          id="card-total-members"
        >
          <div className="absolute right-3 top-3 text-[#5865f2]/10 group-hover:text-[#5865f2]/20 group-hover:scale-110 transition-all duration-200">
            <Users size={64} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1">
            Total de Membros
            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-[#5865f2] transition-opacity" />
          </p>
          <h3 className="text-3xl font-black font-display text-white mt-1.5">{totalMains}</h3>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-[#b5bac1]">
            <span className="text-[#23a55a] font-bold">{activeMembers.length} ativos</span>
            <span>•</span>
            <span className="text-[#f23f43] font-bold">{inactiveMembers.length} inativos</span>
          </div>
        </motion.div>

        {/* Card 2: Makers */}
        <motion.div 
          variants={itemVariants} 
          onClick={() => onNavigateToMembers?.({ statusFilter: 'All', specialFilter: 'WithMakers', searchTerm: '' })}
          className="discord-card rounded-xl p-5 relative overflow-hidden cursor-pointer hover:bg-[#35373C] hover:border-[#23a55a]/30 transition group border border-transparent" 
          id="card-total-makers"
        >
          <div className="absolute right-3 top-3 text-[#23a55a]/10 group-hover:text-[#23a55a]/20 group-hover:scale-110 transition-all duration-200">
            <Star size={64} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1">
            Total de Makers
            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-[#23a55a] transition-opacity" />
          </p>
          <h3 className="text-3xl font-black font-display text-white mt-1.5">{totalMakers}</h3>
          <p className="text-[11px] text-[#b5bac1] mt-3">
            Média de <span className="text-white font-bold">{(totalMains > 0 ? totalMakers / totalMains : 0).toFixed(1)}</span> makers por membro.
          </p>
        </motion.div>

        {/* Card 3: Warnings */}
        <motion.div 
          variants={itemVariants} 
          onClick={() => onNavigateToMembers?.({ statusFilter: 'All', specialFilter: 'WithWarnings', searchTerm: '' })}
          className="discord-card rounded-xl p-5 relative overflow-hidden cursor-pointer hover:bg-[#35373C] hover:border-[#f0b232]/30 transition group border border-transparent" 
          id="card-active-warnings"
        >
          <div className="absolute right-3 top-3 text-[#f0b232]/10 group-hover:text-[#f0b232]/20 group-hover:scale-110 transition-all duration-200">
            <ShieldAlert size={64} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1">
            Warnings Ativos
            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-[#f0b232] transition-opacity" />
          </p>
          <h3 className="text-3xl font-black font-display text-[#f0b232] mt-1.5">{activeWarningsCount}</h3>
          <p className="text-[11px] text-[#b5bac1] mt-3">
            Requere atenção e acompanhamento de líderes.
          </p>
        </motion.div>

        {/* Card 4: Sanguine Access */}
        <motion.div variants={itemVariants} className="discord-card rounded-xl p-5 relative overflow-hidden" id="card-sanguine-access">
          <div className="absolute right-3 top-3 text-[#f23f43]/10">
            <Award size={64} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#949ba4]">Acesso Sanguine</p>
          <h3 className="text-3xl font-black font-display text-[#f23f43] mt-1.5">{sanguineAccessCount}</h3>
          <div className="w-full bg-[#1E1F22] h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-[#f23f43] h-full rounded-full" 
              style={{ width: `${activeMembers.length > 0 ? (sanguineAccessCount / activeMembers.length) * 100 : 0}%` }}
            />
          </div>
        </motion.div>

        {/* Card 5: Crypt Access */}
        <motion.div variants={itemVariants} className="discord-card rounded-xl p-5 relative overflow-hidden" id="card-crypt-access">
          <div className="absolute right-3 top-3 text-[#a370f7]/10">
            <Award size={64} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#949ba4]">Acesso Crypt</p>
          <h3 className="text-3xl font-black font-display text-[#a370f7] mt-1.5">{cryptAccessCount}</h3>
          <div className="w-full bg-[#1E1F22] h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-[#a370f7] h-full rounded-full" 
              style={{ width: `${activeMembers.length > 0 ? (cryptAccessCount / activeMembers.length) * 100 : 0}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* Row: Accesses & Goals Bento-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
        
        {/* Left column: Acessos Distribution */}
        <motion.div variants={itemVariants} className="discord-card rounded-xl p-5 flex flex-col justify-between" id="dashboard-access-stats">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#dbdee1] flex items-center gap-2 mb-4">
              <Star size={16} className="text-[#5865f2]" />
              Distribuição de Acessos
            </h3>
            
            <div className="space-y-4">
              {/* Sanguine Progress row */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Sanguine Quest</span>
                  <span className="text-[#949ba4] font-mono">{sanguineAccessCount} de {activeMembers.length} ativos</span>
                </div>
                <div className="w-full bg-[#1E1F22] h-2.5 rounded-full overflow-hidden border border-[#1E1F22]">
                  <div 
                    className="bg-gradient-to-r from-[#f23f43] to-[#e78486] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeMembers.length > 0 ? (sanguineAccessCount / activeMembers.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Crypt Progress row */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Crypt Access</span>
                  <span className="text-[#949ba4] font-mono">{cryptAccessCount} de {activeMembers.length} ativos</span>
                </div>
                <div className="w-full bg-[#1E1F22] h-2.5 rounded-full overflow-hidden border border-[#1E1F22]">
                  <div 
                    className="bg-gradient-to-r from-[#8a5cf5] to-[#c6b1f9] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeMembers.length > 0 ? (cryptAccessCount / activeMembers.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Dragãozinho Progress row */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Acesso Dragãozinho</span>
                  <span className="text-[#949ba4] font-mono">{dragonAccessCount} de {activeMembers.length} ativos</span>
                </div>
                <div className="w-full bg-[#1E1F22] h-2.5 rounded-full overflow-hidden border border-[#1E1F22]">
                  <div 
                    className="bg-gradient-to-r from-[#31c4f3] to-[#99e2fa] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeMembers.length > 0 ? (dragonAccessCount / activeMembers.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1E1F22] bg-[#1E1F22] -mx-5 -mb-5 p-4 rounded-b-xl text-xs text-[#949ba4] flex items-center gap-2">
            <UserCheck size={14} className="text-[#23a55a]" />
            <span>Porcentagem baseada apenas nos membros de status **Ativo**.</span>
          </div>
        </motion.div>

        {/* Center column: Level Goals Chart */}
        <motion.div variants={itemVariants} className="discord-card rounded-xl p-5 lg:col-span-2" id="dashboard-level-goals-chart">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#dbdee1] flex items-center gap-2 mb-4">
            <Award size={16} className="text-[#f0b232]" />
            Quantidade de Makers por Maior Meta Alcançada
          </h3>

          <div className="h-44 flex items-end gap-2.5 pt-3 border-b border-[#1E1F22]" id="goals-svg-chart">
            {goalsToDisplay.map((goal, idx) => {
              // Calculate percentage of max count to scale heights beautifully
              const maxCount = Math.max(...goalsToDisplay.map(g => g.count), 1);
              const heightPct = (goal.count / maxCount) * 100;

              return (
                <div key={goal.label} className="flex-1 flex flex-col items-center h-full group" id={`goal-bar-${goal.label}`}>
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold font-mono -translate-y-1 z-10 select-none">
                    {goal.count}
                  </div>
                  
                  {/* Visual Bar */}
                  <div className="w-full bg-[#1E1F22] rounded-t-md relative flex-1 flex items-end overflow-hidden">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.02 }}
                      className={`w-full rounded-t-md ${
                        goal.count > 0 
                          ? 'bg-gradient-to-t from-[#5865f2] to-[#7983f5]' 
                          : 'bg-[#1E1F22]'
                      }`}
                    />
                  </div>
                  
                  {/* Label */}
                  <span className="text-[9px] font-bold font-mono text-[#949ba4] mt-2 block truncate w-full text-center">
                    {goal.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#949ba4] mt-4 font-sans">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#5865f2] inline-block" />
              Makers Ativos
            </span>
            <span>Total: <strong className="text-white">{totalMakers}</strong> makers registrados</span>
          </div>
        </motion.div>
      </div>

      {/* Row: Latest Members & Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-recent-activity-grid">
        
        {/* Left: Latest Registered Members */}
        <motion.div variants={itemVariants} className="discord-card rounded-xl p-5" id="dashboard-latest-members">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#dbdee1] flex items-center gap-2">
              <Users size={16} className="text-[#23a55a]" />
              Últimos Membros Cadastrados
            </h3>
            <span className="text-[10px] bg-[#1E1F22] text-[#949ba4] px-2 py-0.5 rounded-full border border-[#1E1F22] font-bold">
              Novos Recrutas
            </span>
          </div>

          <div className="divide-y divide-[#1E1F22] overflow-hidden" id="latest-members-list">
            {latestMembers.length === 0 ? (
              <p className="text-xs text-[#949ba4] py-8 text-center">Nenhum membro cadastrado ainda.</p>
            ) : (
              latestMembers.map((member) => (
                <div 
                  key={member.id} 
                  onClick={() => onViewMember(member)}
                  className="py-3 flex items-center justify-between hover:bg-[#35373C] px-2 rounded-lg transition duration-150 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1E1F22] border border-white/5 rounded-full flex items-center justify-center font-bold text-xs text-white">
                      {member.main.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-white flex items-center gap-1">
                        {member.main}
                        <ArrowUpRight size={12} className="text-[#5865f2] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-[#949ba4]">TS: <span className="text-[#dbdee1]">{member.tsNick || 'Não possui'}</span></p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide rounded-full ${
                      member.status === 'Active' ? 'bg-[#23a55a]/15 text-[#23a55a]' : 'bg-[#f23f43]/15 text-[#f23f43]'
                    }`}>
                      {member.status === 'Active' ? 'Ativo' : 'Inativo'}
                    </span>
                    <p className="text-[10px] text-[#949ba4] mt-1 font-mono">{member.joinDate}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right: Recent Action History Logs */}
        <motion.div variants={itemVariants} className="discord-card rounded-xl p-5" id="dashboard-recent-logs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#dbdee1] flex items-center gap-2">
              <Clock size={16} className="text-[#a370f7]" />
              Últimas Alterações Realizadas
            </h3>
            <span className="text-[10px] bg-[#1E1F22] text-[#949ba4] px-2 py-0.5 rounded-full border border-[#1E1F22] font-bold">
              Histórico Vivo
            </span>
          </div>

          <div className="space-y-3" id="latest-logs-list">
            {latestLogs.length === 0 ? (
              <p className="text-xs text-[#949ba4] py-8 text-center">Nenhuma ação registrada no histórico.</p>
            ) : (
              latestLogs.map((log) => {
                let actionColor = 'text-[#5865f2] bg-[#5865f2]/10';
                if (log.action.includes('WARNING')) actionColor = 'text-[#f0b232] bg-[#f0b232]/10';
                if (log.action.includes('REMOÇÃO')) actionColor = 'text-[#f23f43] bg-[#f23f43]/10';
                if (log.action.includes('LOGIN')) actionColor = 'text-[#23a55a] bg-[#23a55a]/10';
                if (log.action.includes('CADASTRO')) actionColor = 'text-[#23a55a] bg-[#23a55a]/10';

                return (
                  <div key={log.id} className="p-2.5 bg-[#1E1F22] rounded-lg border border-[#1E1F22] flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${actionColor}`}>
                          {log.action}
                        </span>
                        <span className="text-[#b5bac1] font-semibold">{log.username}</span>
                      </div>
                      <p className="text-[#dbdee1] leading-relaxed font-sans">{log.details}</p>
                    </div>
                    <div className="shrink-0 text-left md:text-right text-[10px] text-[#949ba4] font-mono leading-tight">
                      <div>{log.date}</div>
                      <div>{log.time}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
