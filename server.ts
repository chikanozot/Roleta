import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { AsyncLocalStorage } from 'async_hooks';
import { DatabaseState, User, Member, HistoryLog, Maker, Warning, GoalHistoryItem } from './src/types';

export const app = express();
const PORT = 3000;

app.use(express.json());


// Path to store our JSON file database
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'guild_db.json');

// Safe write helpers to prevent crashes on read-only filesystems
function safeWriteFileSync(filePath: string, content: string) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    console.warn(`[Safe FS] Unable to write to ${filePath}:`, err);
  }
}

function safeMkdirSync(dirPath: string) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    console.warn(`[Safe FS] Unable to create directory ${dirPath}:`, err);
  }
}

// Helper to ensure data directory and file exist
function initializeDatabase(): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    safeMkdirSync(DATA_DIR);
  }

  const defaultState: DatabaseState = {
    users: [
      {
        id: 'user-zotgod',
        username: 'zOtGOD',
        password: 'Caio1993',
        role: 'Administrador',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-admin',
        username: 'admin',
        password: '123', // Clean, simple passwords for initial testing/dev
        role: 'Administrador',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-lider',
        username: 'lider',
        password: '123',
        role: 'Líder',
        active: true,
        createdAt: new Date().toISOString()
      }
    ],
    members: [
      {
        id: 'member-1',
        main: 'Kharsek',
        tsNick: 'Kharsek [TS]',
        joinDate: '2025-01-15',
        responsibleLeader: 'admin',
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
        details: 'Banco de dados inicializado com sucesso.'
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

  if (!fs.existsSync(DB_FILE)) {
    safeWriteFileSync(DB_FILE, JSON.stringify(defaultState, null, 2));
    return defaultState;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // Ensure users array exists
    if (!parsed.users) {
      parsed.users = [];
    }

    // Check if zOtGOD exists (case-insensitive)
    const zotgodIndex = parsed.users.findIndex((u: any) => u.username.toLowerCase() === 'zotgod');
    if (zotgodIndex === -1) {
      parsed.users.unshift({
        id: 'user-zotgod',
        username: 'zOtGOD',
        password: 'Caio1993',
        role: 'Administrador',
        active: true,
        createdAt: new Date().toISOString()
      });
      safeWriteFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    } else {
      // Ensure password is Caio1993, role is Administrador, and active is true
      const existing = parsed.users[zotgodIndex];
      if (existing.password !== 'Caio1993' || existing.role !== 'Administrador' || !existing.active) {
        existing.password = 'Caio1993';
        existing.role = 'Administrador';
        existing.active = true;
        safeWriteFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
      }
    }

    if (!parsed.globalGoals) {
      parsed.globalGoals = {
        sanguine: false,
        crypt: false,
        dragon: false,
        makerLevel: '450+'
      };
      safeWriteFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database file, using fallback state:', err);
    return defaultState;
  }
}

// Configuração do cliente do Supabase com os dados reais informados pelo usuário
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zeqyvgtzrbmfsopyimzi.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcXl2Z3R6cmJtZnNvcHlpbXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM4NTksImV4cCI6MjA5ODU4OTg1OX0.qmh0WEaG3XwfQPX0Z7Z52BA2VV5uwr114nTbiTqUqc0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Definição do AsyncLocalStorage para manter o estado do banco isolado por requisição (Thread-safe)
const dbStorage = new AsyncLocalStorage<DatabaseState>();
let dbInMemory = initializeDatabase();

declare global {
  var db: DatabaseState;
}

Object.defineProperty(globalThis, 'db', {
  get() {
    return dbStorage.getStore() || dbInMemory;
  },
  set(val) {
    dbInMemory = val;
  },
  configurable: true
});

// Helper para obter o estado do banco no Supabase com resiliência local
async function getDatabaseState(): Promise<DatabaseState> {
  try {
    const { data, error } = await supabase
      .from('guild_data')
      .select('state')
      .eq('id', 'main')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Tabela existe mas o registro 'main' não existe. Insere o estado padrão.
        console.log('[Supabase] Registro "main" não encontrado. Criando estado inicial...');
        const { error: insertError } = await supabase
          .from('guild_data')
          .insert({ id: 'main', state: dbInMemory });
        
        if (insertError) {
          console.error('[Supabase] Falha ao inserir estado inicial:', insertError.message);
        }
        return dbInMemory;
      }
      
      console.warn(`[Supabase] Erro ao buscar dados (${error.code || error.message}). Usando cache local temporário.`);
      return dbInMemory;
    }

    if (data && data.state) {
      return data.state as DatabaseState;
    }
  } catch (err: any) {
    console.error('[Supabase] Falha catastrófica ao se conectar ao banco:', err.message);
  }
  return dbInMemory;
}

// Helper para salvar o estado no Supabase de forma assíncrona
async function saveDatabaseState(state: DatabaseState) {
  try {
    const { error } = await supabase
      .from('guild_data')
      .upsert({ id: 'main', state });

    if (error) {
      console.error('[Supabase] Falha ao salvar estado no banco:', error.message);
    } else {
      console.log('[Supabase] Sincronização com o Supabase efetuada com sucesso!');
    }
  } catch (err: any) {
    console.error('[Supabase] Erro na requisição de persistência:', err.message);
  }
}

// Middleware do Express para interceptar cada requisição e sincronizar os dados do Supabase
app.use(async (req, res, next) => {
  try {
    const latestState = await getDatabaseState();
    dbStorage.run(latestState, () => {
      next();
    });
  } catch (err: any) {
    console.error('[Middleware] Falha ao carregar estado do Supabase:', err.message);
    dbStorage.run(dbInMemory, () => {
      next();
    });
  }
});

// Write helper
function writeDatabase(state: DatabaseState) {
  dbInMemory = state;
  safeWriteFileSync(DB_FILE, JSON.stringify(state, null, 2));
  // Dispara a sincronização em nuvem assincronamente sem bloquear a resposta do Express
  saveDatabaseState(state).catch(err => {
    console.error('[Supabase] Erro na sincronização assíncrona:', err);
  });
}


// Add a history helper
function logAction(username: string, action: string, details: string) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const newLog: HistoryLog = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: now.toISOString(),
    date: dateStr,
    time: timeStr,
    username,
    action,
    details
  };

  db.history.unshift(newLog); // Put latest logs first
  writeDatabase(db);
}

// API ROUTES

// Auth Route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    return;
  }

  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    res.status(401).json({ message: 'Usuário não encontrado.' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ message: 'Esta conta de usuário foi desativada.' });
    return;
  }

  if (user.password !== password) {
    res.status(410).json({ message: 'Senha incorreta.' }); // 410 or 401 is fine, let's keep it clear
    return;
  }

  // Success
  logAction(user.username, 'LOGIN', `Usuário ${user.username} efetuou login no painel.`);
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

app.post('/api/auth/logout', (req, res) => {
  const { username } = req.body;
  if (username) {
    logAction(username, 'LOGOUT', `Usuário ${username} deslogou do painel.`);
  }
  res.json({ status: 'ok' });
});

// Full state fetch
app.get('/api/db', (req, res) => {
  // Return database state (strip passwords on client request to protect them)
  const safeUsers = db.users.map(u => {
    const { password: _, ...rest } = u;
    return rest;
  });
  res.json({ ...db, users: safeUsers });
});

// Update Global Goals
app.post('/api/global-goals', (req, res) => {
  const { sanguine, crypt, dragon, makerLevel, username } = req.body;

  db.globalGoals = {
    sanguine: !!sanguine,
    crypt: !!crypt,
    dragon: !!dragon,
    makerLevel: makerLevel ? String(makerLevel).trim() : 'none'
  };

  writeDatabase(db);
  logAction(username || 'Líder', 'ALTERACAO_META_GLOBAL', `Metas Globais atualizadas por ${username || 'Sistema'}. Sanguine: ${sanguine ? 'Sim' : 'Não'}, Crypt: ${crypt ? 'Sim' : 'Não'}, Dragãozinho: ${dragon ? 'Sim' : 'Não'}, Meta Level Maker: ${makerLevel || 'Nenhuma'}.`);

  res.json({ success: true, globalGoals: db.globalGoals });
});

// Admin-only direct state fetch (with passwords) for user editing
app.get('/api/admin/users', (req, res) => {
  const requester = (req.query.requester as string || '').toLowerCase().trim();
  if (requester !== 'zotgod') {
    res.status(403).json({ message: 'Acesso negado. Apenas o administrador principal (zOtGOD) pode listar usuários.' });
    return;
  }
  res.json({ users: db.users });
});

// Sync database from localStorage (if client has more up-to-date data during cold boot)
app.post('/api/db/sync', (req, res) => {
  const clientState = req.body as DatabaseState;
  if (!clientState || !Array.isArray(clientState.members)) {
    res.status(400).json({ message: 'Estado inválido enviado para sincronização.' });
    return;
  }

  // Merge logic: check if client has more history or members than current state
  const clientLogCount = clientState.history?.length || 0;
  const serverLogCount = db.history?.length || 0;

  if (clientLogCount > serverLogCount) {
    db = clientState;
    writeDatabase(db);
    logAction('Sistema', 'SINCRONIZAÇÃO', 'O banco de dados foi sincronizado/restaurado a partir do cache do cliente.');
    res.json({ status: 'ok', source: 'client', message: 'Servidor atualizado com os dados locais do cliente.' });
  } else {
    res.json({ status: 'ok', source: 'server', message: 'Servidor já possui os dados mais recentes.' });
  }
});

// Restore database manually
app.post('/api/db/restore', (req, res) => {
  const { state, username } = req.body;
  if (!state || !Array.isArray(state.members) || !Array.isArray(state.users)) {
    res.status(400).json({ message: 'Backup inválido.' });
    return;
  }

  db = state;
  writeDatabase(db);
  logAction(username || 'Administrador', 'RESTAURAÇÃO', 'O banco de dados foi restaurado manualmente através de um arquivo de backup.');
  res.json({ status: 'ok', message: 'Banco de dados restaurado com sucesso!' });
});

// Members - Create Member
app.post('/api/members', (req, res) => {
  const { main, tsNick, joinDate, responsibleLeader, notes, access, status, username, initialMakers } = req.body;

  if (!main || !responsibleLeader) {
    res.status(400).json({ message: 'Nome do Main e Líder Responsável são obrigatórios.' });
    return;
  }

  // Check unique Main (case insensitive)
  const cleanedMain = main.trim();
  const lowerNewMain = cleanedMain.toLowerCase();
  const isMainDuplicate = db.members.some(m => m.main.toLowerCase() === lowerNewMain);
  
  if (isMainDuplicate) {
    res.status(400).json({ message: `O personagem Main "${cleanedMain}" já está cadastrado em nossa guilda.` });
    return;
  }

  // Check unique Maker (cannot have a maker name matching this new main name)
  for (const m of db.members) {
    const matchingMaker = m.makers.find(maker => maker.name.toLowerCase() === lowerNewMain);
    if (matchingMaker) {
      res.status(400).json({ message: `O nome "${cleanedMain}" já está sendo usado como Maker do membro "${m.main}".` });
      return;
    }
  }

  // Process initial makers list
  let makersList: Array<{ name: string; level?: string }> = [];
  if (typeof initialMakers === 'string') {
    makersList = initialMakers.split(',').map(m => m.trim()).filter(m => m.length > 0).map(m => ({ name: m }));
  } else if (Array.isArray(initialMakers)) {
    makersList = initialMakers.map((m: any) => {
      if (m && typeof m === 'object' && m.name) {
        return { name: String(m.name).trim(), level: m.level ? String(m.level).trim() : undefined };
      }
      return { name: String(m).trim() };
    }).filter(m => m.name.length > 0);
  }

  // Validate initial makers
  const seenMakers = new Set<string>();
  for (const maker of makersList) {
    const cleanedMaker = maker.name.trim();
    const lowerMaker = cleanedMaker.toLowerCase();

    if (lowerMaker === lowerNewMain) {
      res.status(400).json({ message: `O nome de Maker "${cleanedMaker}" não pode ser igual ao nome do personagem Main.` });
      return;
    }

    if (seenMakers.has(lowerMaker)) {
      res.status(400).json({ message: `O nome de Maker "${cleanedMaker}" foi inserido mais de uma vez.` });
      return;
    }
    seenMakers.add(lowerMaker);

    // Check duplicate with existing Mains
    const mainDuplicate = db.members.find(m => m.main.toLowerCase() === lowerMaker);
    if (mainDuplicate) {
      res.status(400).json({ message: `O nome do Maker "${cleanedMaker}" já está cadastrado como personagem Main do membro "${mainDuplicate.main}".` });
      return;
    }

    // Check duplicate with existing Makers
    for (const m of db.members) {
      const existingMaker = m.makers.find(mk => mk.name.toLowerCase() === lowerMaker);
      if (existingMaker) {
        res.status(400).json({ message: `O Maker "${cleanedMaker}" já está cadastrado e pertence ao membro "${m.main}".` });
        return;
      }
    }
  }

  // Map to Maker objects
  const initialMakerObjects: Maker[] = makersList.map((m, index) => {
    const levelGoals = [];
    if (m.level) {
      const formattedLevel = /^\d+$/.test(m.level) ? `${m.level}+` : m.level;
      levelGoals.push({
        id: `goal-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        goal: formattedLevel,
        registeredBy: username || responsibleLeader || 'Sistema',
        createdAt: new Date().toISOString()
      });
    }
    return {
      id: `maker-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      name: m.name,
      levelGoals,
      createdAt: new Date().toISOString()
    };
  });

  const newMember: Member = {
    id: `member-${Date.now()}`,
    main: cleanedMain,
    tsNick: tsNick || '',
    joinDate: joinDate || new Date().toISOString().split('T')[0],
    responsibleLeader,
    status: status || 'Active',
    notes: notes || '',
    access: access || { sanguine: false, crypt: false, dragon: false },
    makers: initialMakerObjects,
    warnings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.members.push(newMember);
  writeDatabase(db);

  logAction(username || 'Sistema', 'CADASTRO_MEMBRO', `Membro ${cleanedMain} foi cadastrado por ${username || responsibleLeader}.`);

  if (makersList.length > 0) {
    makersList.forEach(m => {
      const levelSuffix = m.level ? ` (Meta inicial: ${m.level})` : '';
      logAction(username || 'Sistema', 'NOVO_MAKER', `Adicionado Maker "${m.name}"${levelSuffix} para o membro "${cleanedMain}" (Cadastro Inicial) por ${username || responsibleLeader}.`);
    });
  }

  res.status(201).json(newMember);
});

// Members - Edit Member info
app.put('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const { main, tsNick, joinDate, responsibleLeader, notes, access, status, username, makersToDelete } = req.body;

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  // Check duplicate main name (excluding this member)
  if (main && main.trim().toLowerCase() !== member.main.toLowerCase()) {
    const cleanedMain = main.trim();
    const isMainDuplicate = db.members.some(m => m.id !== id && m.main.toLowerCase() === cleanedMain.toLowerCase());
    if (isMainDuplicate) {
      res.status(400).json({ message: `O personagem Main "${cleanedMain}" já está cadastrado por outro membro.` });
      return;
    }

    // Check Maker name conflict
    for (const m of db.members) {
      const matchingMaker = m.makers.find(maker => maker.name.toLowerCase() === cleanedMain.toLowerCase());
      if (matchingMaker) {
        res.status(400).json({ message: `O nome "${cleanedMain}" já está sendo usado como Maker de ${m.main}.` });
        return;
      }
    }
    
    logAction(username || 'Sistema', 'MUDANÇA_MAIN', `Membro "${member.main}" teve o nome alterado para "${cleanedMain}".`);
    member.main = cleanedMain;
  }

  // Logs change details
  const changes: string[] = [];
  if (tsNick !== undefined && tsNick !== member.tsNick) {
    changes.push(`Nick do TS alterado para "${tsNick}"`);
    member.tsNick = tsNick;
  }
  if (joinDate !== undefined && joinDate !== member.joinDate) {
    changes.push(`Data de entrada alterada para ${joinDate}`);
    member.joinDate = joinDate;
  }
  if (responsibleLeader !== undefined && responsibleLeader !== member.responsibleLeader) {
    changes.push(`Líder responsável alterado de "${member.responsibleLeader}" para "${responsibleLeader}"`);
    member.responsibleLeader = responsibleLeader;
  }
  if (notes !== undefined && notes !== member.notes) {
    changes.push(`Observações atualizadas`);
    member.notes = notes;
  }
  if (status !== undefined && status !== member.status) {
    changes.push(`Status alterado de "${member.status === 'Active' ? 'Ativo' : 'Inativo'}" para "${status === 'Active' ? 'Ativo' : 'Inativo'}"`);
    member.status = status;
  }
  if (access !== undefined) {
    const accChanges: string[] = [];
    if (access.sanguine !== member.access.sanguine) accChanges.push(`Sanguine: ${access.sanguine ? 'Sim' : 'Não'}`);
    if (access.crypt !== member.access.crypt) accChanges.push(`Crypt: ${access.crypt ? 'Sim' : 'Não'}`);
    if (access.dragon !== member.access.dragon) accChanges.push(`Dragãozinho: ${access.dragon ? 'Sim' : 'Não'}`);
    
    // Check custom ones dynamically
    Object.keys(access).forEach(key => {
      if (!['sanguine', 'crypt', 'dragon'].includes(key) && access[key] !== member.access[key]) {
        accChanges.push(`${key}: ${access[key] ? 'Sim' : 'Não'}`);
      }
    });

    if (accChanges.length > 0) {
      changes.push(`Acessos atualizados (${accChanges.join(', ')})`);
      member.access = { ...member.access, ...access };
    }
  }

  // Handle makers deletion
  if (Array.isArray(makersToDelete) && makersToDelete.length > 0) {
    const deletedMakerNames: string[] = [];
    member.makers = member.makers.filter(mk => {
      if (makersToDelete.includes(mk.id)) {
        deletedMakerNames.push(mk.name);
        return false;
      }
      return true;
    });
    if (deletedMakerNames.length > 0) {
      changes.push(`Makers removidos: ${deletedMakerNames.join(', ')}`);
      deletedMakerNames.forEach(name => {
        logAction(username || 'Sistema', 'REMOÇÃO_MAKER', `Maker "${name}" foi removido do membro "${member.main}" por ${username}.`);
      });
    }
  }

  if (changes.length > 0) {
    member.updatedAt = new Date().toISOString();
    writeDatabase(db);
    logAction(username || 'Sistema', 'EDIÇÃO_MEMBRO', `Membro "${member.main}" editado por ${username}: ${changes.join('; ')}.`);
  }

  res.json(member);
});

// Makers - Add Maker
app.post('/api/members/:id/makers', (req, res) => {
  const { id } = req.params;
  const { name, username } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ message: 'O nome do Maker é obrigatório.' });
    return;
  }

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  const cleanedName = name.trim();

  // Validate that maker name doesn't match any Main name
  const mainDuplicate = db.members.find(m => m.main.toLowerCase() === cleanedName.toLowerCase());
  if (mainDuplicate) {
    res.status(400).json({ message: `O nome "${cleanedName}" já está cadastrado como personagem Main do membro "${mainDuplicate.main}".` });
    return;
  }

  // Validate that maker name is unique across all makers of all members
  for (const m of db.members) {
    const existingMaker = m.makers.find(mk => mk.name.toLowerCase() === cleanedName.toLowerCase());
    if (existingMaker) {
      res.status(400).json({ message: `O Maker "${cleanedName}" já está cadastrado e pertence ao membro "${m.main}".` });
      return;
    }
  }

  const newMaker: Maker = {
    id: `maker-${Date.now()}`,
    name: cleanedName,
    levelGoals: [],
    createdAt: new Date().toISOString()
  };

  member.makers.push(newMaker);
  member.updatedAt = new Date().toISOString();
  writeDatabase(db);

  logAction(username || 'Sistema', 'NOVO_MAKER', `Adicionado Maker "${cleanedName}" para o membro "${member.main}" por ${username}.`);

  res.status(201).json(newMaker);
});

// Makers - Edit Maker name
app.put('/api/members/:id/makers/:makerId', (req, res) => {
  const { id, makerId } = req.params;
  const { name, username } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ message: 'O nome do Maker é obrigatório.' });
    return;
  }

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  const maker = member.makers.find(mk => mk.id === makerId);
  if (!maker) {
    res.status(404).json({ message: 'Maker não encontrado.' });
    return;
  }

  const cleanedName = name.trim();
  if (cleanedName.toLowerCase() === maker.name.toLowerCase()) {
    res.json(maker);
    return;
  }

  // Validate that maker name doesn't match any Main name
  const mainDuplicate = db.members.find(m => m.main.toLowerCase() === cleanedName.toLowerCase());
  if (mainDuplicate) {
    res.status(400).json({ message: `O nome "${cleanedName}" já está cadastrado como personagem Main de "${mainDuplicate.main}".` });
    return;
  }

  // Validate that maker name is unique across all makers
  for (const m of db.members) {
    const existingMaker = m.makers.find(mk => mk.id !== makerId && mk.name.toLowerCase() === cleanedName.toLowerCase());
    if (existingMaker) {
      res.status(400).json({ message: `O Maker "${cleanedName}" já pertence ao membro "${m.main}".` });
      return;
    }
  }

  const oldName = maker.name;
  maker.name = cleanedName;
  member.updatedAt = new Date().toISOString();
  writeDatabase(db);

  logAction(username || 'Sistema', 'EDIÇÃO_MAKER', `Maker "${oldName}" de "${member.main}" renomeado para "${cleanedName}" por ${username}.`);

  res.json(maker);
});

// Makers - Delete Maker
app.delete('/api/members/:id/makers/:makerId', (req, res) => {
  const { id, makerId } = req.params;
  const body = req.body || {};
  const query = req.query || {};
  const username = body.username || query.username || 'Sistema';

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  const makerIndex = member.makers.findIndex(mk => mk.id === makerId);
  if (makerIndex === -1) {
    res.status(404).json({ message: 'Maker não encontrado.' });
    return;
  }

  const makerName = member.makers[makerIndex].name;
  member.makers.splice(makerIndex, 1);
  member.updatedAt = new Date().toISOString();
  writeDatabase(db);

  logAction(username, 'REMOÇÃO_MAKER', `Maker "${makerName}" foi removido do membro "${member.main}" por ${username}.`);

  res.json({ message: 'Maker removido com sucesso.' });
});

// Goals - Add Goal History (Evolução de Metas)
app.post('/api/members/:id/makers/:makerId/goals', (req, res) => {
  const { id, makerId } = req.params;
  const { goal, username } = req.body;

  if (!goal) {
    res.status(400).json({ message: 'A meta (e.g. 250+, 500+) é obrigatória.' });
    return;
  }

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  const maker = member.makers.find(mk => mk.id === makerId);
  if (!maker) {
    res.status(404).json({ message: 'Maker não encontrado.' });
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const newGoal: GoalHistoryItem = {
    id: `goal-${Date.now()}`,
    goal,
    date: dateStr,
    time: timeStr,
    byUser: username || 'Sistema'
  };

  maker.levelGoals.push(newGoal);
  member.updatedAt = new Date().toISOString();
  writeDatabase(db);

  logAction(username || 'Sistema', 'NOVA_META', `Meta "${goal}" registrada para o Maker "${maker.name}" (Membro: ${member.main}) por ${username}.`);

  res.status(201).json(newGoal);
});

// Warnings - Add Warning
app.post('/api/members/:id/warnings', (req, res) => {
  const { id } = req.params;
  const { reason, username } = req.body;

  if (!reason || !reason.trim()) {
    res.status(400).json({ message: 'O motivo do Warning é obrigatório.' });
    return;
  }

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const newWarning: Warning = {
    id: `warn-${Date.now()}`,
    reason: reason.trim(),
    date: dateStr,
    time: timeStr,
    byLeader: username || 'Sistema',
    removed: false
  };

  member.warnings.push(newWarning);
  member.updatedAt = new Date().toISOString();
  writeDatabase(db);

  logAction(username || 'Sistema', 'NOVO_WARNING', `Warning adicionado para "${member.main}" por ${username}. Motivo: ${reason}`);

  res.status(201).json(newWarning);
});

// Warnings - Remove/Cancel Warning (Soft Delete)
app.post('/api/members/:id/warnings/:warningId/remove', (req, res) => {
  const { id, warningId } = req.params;
  const { username, userRole } = req.body;

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  const warning = member.warnings.find(w => w.id === warningId);
  if (!warning) {
    res.status(404).json({ message: 'Warning não encontrado.' });
    return;
  }

  // Security: Only creator or Administrator can remove
  const isCreator = warning.byLeader.toLowerCase() === username.toLowerCase();
  const isAdmin = userRole === 'Administrador';

  if (!isCreator && !isAdmin) {
    res.status(403).json({ message: 'Apenas o líder que criou o Warning ou um Administrador podem removê-lo.' });
    return;
  }

  const now = new Date();
  warning.removed = true;
  warning.removedBy = username;
  warning.removedDate = now.toISOString().split('T')[0];
  warning.removedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  member.updatedAt = new Date().toISOString();
  writeDatabase(db);

  logAction(username, 'REMOÇÃO_WARNING', `Warning de "${member.main}" (criado por ${warning.byLeader}) foi removido por ${username}.`);

  res.json(warning);
});

// Access Types - Manage dynamic creation of accesses
app.post('/api/access-types', (req, res) => {
  const { id, label, username } = req.body;
  if (!id || !label) {
    res.status(400).json({ message: 'ID e Rótulo do acesso são obrigatórios.' });
    return;
  }

  const cleanedId = id.trim().toLowerCase().replace(/\s+/g, '_');
  const exists = db.accessTypes.some(a => a.id === cleanedId);
  if (exists) {
    res.status(400).json({ message: `O tipo de acesso com ID "${cleanedId}" já existe.` });
    return;
  }

  db.accessTypes.push({ id: cleanedId, label: label.trim() });
  
  // Set default false for all members on this new access type
  db.members.forEach(m => {
    if (m.access) {
      m.access[cleanedId] = false;
    }
  });

  writeDatabase(db);
  logAction(username || 'Sistema', 'NOVO_TIPO_ACESSO', `Novo tipo de acesso "${label}" adicionado por ${username}.`);
  res.status(201).json({ id: cleanedId, label: label.trim() });
});

// Users - Create User
app.post('/api/users', (req, res) => {
  const { username, password, role, active, creatorUsername } = req.body;

  if ((creatorUsername || '').toLowerCase().trim() !== 'zotgod') {
    res.status(403).json({ message: 'Acesso negado. Apenas o administrador principal (zOtGOD) pode criar usuários.' });
    return;
  }

  if (!username || !password || !role) {
    res.status(400).json({ message: 'Nome de usuário, senha e cargo são obrigatórios.' });
    return;
  }

  const cleanedUsername = username.trim().toLowerCase();
  const exists = db.users.some(u => u.username.toLowerCase() === cleanedUsername);
  if (exists) {
    res.status(400).json({ message: `O usuário "${username}" já existe.` });
    return;
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    username: username.trim(),
    password: password,
    role: role,
    active: active !== undefined ? active : true,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDatabase(db);

  logAction(creatorUsername || 'Sistema', 'CRIAR_USUÁRIO', `Novo usuário de acesso "${newUser.username}" com cargo "${role}" criado por ${creatorUsername}.`);

  // Strip password in response
  const { password: _, ...safeResponse } = newUser;
  res.status(201).json(safeResponse);
});

// Users - Edit User
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, role, active, editorUsername } = req.body;

  if ((editorUsername || '').toLowerCase().trim() !== 'zotgod') {
    res.status(403).json({ message: 'Acesso negado. Apenas o administrador principal (zOtGOD) pode editar usuários.' });
    return;
  }

  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ message: 'Usuário não encontrado.' });
    return;
  }

  const changes: string[] = [];
  if (username && username.trim().toLowerCase() !== user.username.toLowerCase()) {
    const cleaned = username.trim();
    const exists = db.users.some(u => u.id !== id && u.username.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      res.status(400).json({ message: `Nome de usuário "${cleaned}" já está sendo usado por outro login.` });
      return;
    }
    changes.push(`Username alterado de "${user.username}" para "${cleaned}"`);
    user.username = cleaned;
  }

  if (password && password !== '') {
    changes.push(`Senha alterada`);
    user.password = password;
  }

  if (role && role !== user.role) {
    changes.push(`Cargo alterado de "${user.role}" para "${role}"`);
    user.role = role;
  }

  if (active !== undefined && active !== user.active) {
    changes.push(`Status ativo alterado de "${user.active}" para "${active}"`);
    user.active = active;
  }

  if (changes.length > 0) {
    writeDatabase(db);
    logAction(editorUsername || 'Sistema', 'EDIÇÃO_USUÁRIO', `Usuário "${user.username}" editado por ${editorUsername}: ${changes.join(', ')}.`);
  }

  const { password: _, ...safeResponse } = user;
  res.json(safeResponse);
});


// Production build static fallback & Vite dev config
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
    
    // Fallback for HTML5 routing
    app.use('*', async (req, res, next) => {
      try {
        const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Bind to host 0.0.0.0 and port 3000 if not running on a serverless platform like Vercel
if (process.env.NODE_ENV !== 'production' || (!process.env.VERCEL && !process.env.VERCEL_ENV)) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Guild Manager running on port ${PORT}`);
  });
}

export default app;
