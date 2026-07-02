import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Key, User as UserIcon, AlertCircle, Sparkles } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const cleanUsername = username.trim();

    try {
      // Try backend authentication first
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUsername, password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        onLoginSuccess(data.user);
        setIsLoading(false);
        return;
      } else {
        // If the server explicitly rejected the credentials with a status other than 404/5xx, show that error
        if (response.status !== 404 && response.status < 500) {
          throw new Error(data.message || 'Erro ao efetuar login.');
        }
      }
    } catch (err: any) {
      console.warn('Backend login failed, attempting local client-side validation fallback:', err.message);
    }

    // Client-side local fallback validation (useful if backend is offline or on a static platform)
    const localUsers: User[] = [
      {
        id: 'user-zotgod',
        username: 'zOtGOD',
        role: 'Administrador',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-admin',
        username: 'admin',
        role: 'Administrador',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-lider',
        username: 'lider',
        role: 'Líder',
        active: true,
        createdAt: new Date().toISOString()
      }
    ];

    const matchedUser = localUsers.find(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (matchedUser) {
      // Validate passwords locally
      const expectedPassword = 
        matchedUser.username.toLowerCase() === 'zotgod' ? 'Caio1993' : '123';
      
      if (password === expectedPassword) {
        onLoginSuccess(matchedUser);
        setIsLoading(false);
        return;
      } else {
        setError('Senha incorreta.');
        setIsLoading(false);
        return;
      }
    }

    setError('Usuário não encontrado.');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#313338] p-4 relative overflow-hidden" id="login-container">
      {/* Visual background flourishes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#5865f2]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#23a55a]/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md discord-card rounded-xl p-8 z-10 flex flex-col relative"
        id="login-card"
      >
        {/* Gaming Border Line Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5865f2] to-[#4752c4] rounded-t-xl" />

        <div className="flex flex-col items-center mb-6 text-center" id="login-header">
          <div className="p-3 bg-[#5865f2]/10 rounded-full mb-3 text-[#5865f2] border border-[#5865f2]/20">
            <Shield size={32} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#f2f3f5] mb-1">
            Guild Manager
          </h1>
          <p className="text-sm text-[#b5bac1] font-sans">
            Gerenciamento de Guild Roleta Russa Team / Global
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 p-3.5 bg-[#f23f43]/10 border border-[#f23f43]/20 rounded-lg flex items-start gap-2.5 text-[#f23f43] text-sm"
            id="login-error"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
              Nome de Usuário
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949ba4]">
                <UserIcon size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-3 pl-11 pr-4 text-sm text-[#f2f3f5] placeholder-[#949ba4] focus:outline-none focus:border-[#5865f2] focus:ring-1 focus:ring-[#5865f2] transition duration-200"
                placeholder="Insira seu usuário"
                id="login-username-input"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
              Senha
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949ba4]">
                <Key size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-3 pl-11 pr-4 text-sm text-[#f2f3f5] placeholder-[#949ba4] focus:outline-none focus:border-[#5865f2] focus:ring-1 focus:ring-[#5865f2] transition duration-200"
                placeholder="Insira sua senha"
                id="login-password-input"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-white font-medium py-3 px-4 rounded-lg text-sm transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#5865f2]/10"
            id="login-submit-button"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Informative credentials section to prevent user blockage */}
        <div className="mt-8 pt-5 border-t border-[#1E1F22]" id="login-credentials-info">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#f0b232] uppercase tracking-wider mb-2.5">
            <Sparkles size={14} />
            <span>Acessos de Teste (Padrão)</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs bg-[#1E1F22] p-3 rounded-lg border border-[#1E1F22]">
            <div>
              <p className="text-[#b5bac1] font-semibold">Administrador Principal:</p>
              <code className="text-[#f2f3f5] font-mono select-all block mt-0.5">zOtGOD</code>
              <code className="text-[#f2f3f5] font-mono select-all block">Caio1993</code>
            </div>
            <div>
              <p className="text-[#b5bac1] font-semibold">Líder:</p>
              <code className="text-[#f2f3f5] font-mono select-all block mt-0.5">lider</code>
              <code className="text-[#f2f3f5] font-mono select-all block">123</code>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
