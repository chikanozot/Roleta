import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DatabaseState, User, Member, HistoryLog, Maker, Warning, GoalHistoryItem } from './src/types';

export const app = express();
const PORT = 3000;

app.use(express.json());

// Path to store our JSON file database
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'guild_db.json');

// Safe write helpers to prevent crashes on read-only filesystems (e.g. Vercel)
function safeWriteFileSync(filePath: string, content: string) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    console.warn(`[Safe FS] Unable to write to ${filePath} (this is normal on read-only filesystems like Vercel):`, err);
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
        password: '123',
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
    members: [],
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

    if (!parsed.users) {
      parsed.users = [];
    }

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

// Write helper
function writeDatabase(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Load database state
let db = initializeDatabase();

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

  db.history.unshift(newLog);
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
    res.status(410).json({ message: 'Senha incorreta.' });
    return;
  }

  logAction(user.username, 'LOGIN', `Usuário ${user.username} efetuou login no painel.`);
  
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
  logAction(username || 'Líder', 'ALTERACAO_META_GLOBAL', `Metas Globais atualizadas.`);

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

// Sync database from localStorage
app.post('/api/db/sync', (req, res) => {
  const clientState = req.body as DatabaseState;
  if (!clientState || !Array.isArray(clientState.members)) {
    res.status(400).json({ message: 'Estado inválido enviado para sincronização.' });
    return;
  }

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
  const { main, tsNick, joinDate, responsibleLeader, notes, access, status, username } = req.body;

  if (!main || !responsibleLeader) {
    res.status(400).json({ message: 'Nome do Main e Líder Responsável são obrigatórios.' });
    return;
  }

  const cleanedMain = main.trim();
  const lowerNewMain = cleanedMain.toLowerCase();
  const isMainDuplicate = db.members.some(m => m.main.toLowerCase() === lowerNewMain);
  
  if (isMainDuplicate) {
    res.status(400).json({ message: `O personagem Main "${cleanedMain}" já está cadastrado em nossa guilda.` });
    return;
  }

  const newMember: Member = {
    id: `member-${Date.now()}`,
    main: cleanedMain,
    tsNick: tsNick || '',
    joinDate: joinDate || new Date().toISOString().split('T')[0],
    responsibleLeader,
    status: status || 'Active',
    notes: notes || '',
    access: access || { sanguine: false, crypt: false, dragon: false },
    makers: [],
    warnings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.members.push(newMember);
  writeDatabase(db);

  logAction(username || 'Sistema', 'CADASTRO_MEMBRO', `Membro ${cleanedMain} foi cadastrado.`);

  res.status(201).json(newMember);
});

// Members - Edit Member info
app.put('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const { main, tsNick, joinDate, responsibleLeader, notes, access, status, username } = req.body;

  const member = db.members.find(m => m.id === id);
  if (!member) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  if (main && main.trim().toLowerCase() !== member.main.toLowerCase()) {
    const cleanedMain = main.trim();
    const isMainDuplicate = db.members.some(m => m.id !== id && m.main.toLowerCase() === cleanedMain.toLowerCase());
    if (isMainDuplicate) {
      res.status(400).json({ message: `O personagem Main "${cleanedMain}" já está cadastrado por outro membro.` });
      return;
    }
    member.main = cleanedMain;
  }

  if (tsNick !== undefined) member.tsNick = tsNick;
  if (joinDate !== undefined) member.joinDate = joinDate;
  if (responsibleLeader !== undefined) member.responsibleLeader = responsibleLeader;
  if (notes !== undefined) member.notes = notes;
  if (status !== undefined) member.status = status;
  if (access !== undefined) member.access = { ...member.access, ...access };

  member.updatedAt = new Date().toISOString();
  writeDatabase(db);

  logAction(username || 'Sistema', 'EDIÇÃO_MEMBRO', `Membro "${member.main}" foi editado.`);

  res.json(member);
});

// Members - Delete Member
app.delete('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const { username } = req.body;

  const memberIndex = db.members.findIndex(m => m.id === id);
  if (memberIndex === -1) {
    res.status(404).json({ message: 'Membro não encontrado.' });
    return;
  }

  const member = db.members[memberIndex];
  db.members.splice(memberIndex, 1);
  writeDatabase(db);

  logAction(username || 'Sistema', 'EXCLUSÃO_MEMBRO', `Membro "${member.main}" foi removido da guilda.`);

  res.json({ status: 'ok', message: `Membro "${member.main}" foi removido com sucesso.` });
});

// Vite middleware for development
let vite: any;

async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
    app.get('*', (req, res) => {
      res.type('html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Roleta</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
        </html>
      `);
    });
  }
}

setupVite().catch(err => {
  console.error('Failed to setup Vite:', err);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

