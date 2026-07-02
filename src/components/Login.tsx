import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Key, User as UserIcon, Mail, AlertCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    setSupabaseConfigured(isSupabaseConfigured());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (supabaseConfigured) {
        // Authenticate with Supabase Auth using email and password
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (data.user) {
          const usernameFromEmail = data.user.email?.split('@')[0] || 'usuario';
          const finalUsername = data.user.user_metadata?.username || usernameFromEmail;
          const userRole = data.user.user_metadata?.role || 'Administrador';

          const loggedInUser: User = {
            id: data.user.id,
            username: finalUsername,
            role: userRole,
            active: true,
            createdAt: data.user.created_at || new Date().toISOString()
          };

          onLoginSuccess(loggedInUser);
        }
      } else {
        // Fallback local login if Supabase is not configured
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: email.trim(), password: password.trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao efetuar login.');
        }

        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Falha de comunicação.');
    } finally {
      setIsLoading(false);
    }
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
        className="w-full max-w-md discord-card rounded-xl p-8 z-10 flex flex-col relative animate-fade-in"
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
            {supabaseConfigured ? 'Autenticação via Supabase' : 'Gerenciamento de Guild Roleta Russa Team'}
          </p>
        </div>

        {/* Supabase Status Alert */}
        {!supabaseConfigured && (
          <div className="mb-5 p-3 bg-[#f0b232]/10 border border-[#f0b232]/20 rounded-lg flex items-start gap-2.5 text-[#f0b232] text-xs leading-relaxed">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-[#f0b232]" />
            <div>
              <p className="font-bold mb-0.5">Supabase não configurado</p>
              <p className="opacity-90">Defina <code className="bg-black/30 px-1 rounded font-mono text-[11px]">VITE_SUPABASE_URL=https://zeqyvgtzrbmfsopyimzi.supabase.co e <code className="bg-black/30 px-1 rounded font-mono text-[11px]">VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcXl2Z3R6cmJtZnNvcHlpbXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM4NTksImV4cCI6MjA5ODU4OTg1OX0.qmh0WEaG3XwfQPX0Z7Z52BA2VV5uwr114nTbiTqUqc0 na Vercel para ativar o Supabase Auth. Usando credenciais locais de teste.</p>
            </div>
          </div>
        )}

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
              {supabaseConfigured ? 'Endereço de E-mail' : 'Nome de Usuário / E-mail'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949ba4]">
                {supabaseConfigured ? <Mail size={18} /> : <UserIcon size={18} />}
              </span>
              <input
                type={supabaseConfigured ? "email" : "text"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded-lg py-3 pl-11 pr-4 text-sm text-[#f2f3f5] placeholder-[#949ba4] focus:outline-none focus:border-[#5865f2] focus:ring-1 focus:ring-[#5865f2] transition duration-200"
                placeholder={supabaseConfigured ? "exemplo@dominio.com" : "Insira seu usuário"}
                id="login-username-input"
                autoComplete={supabaseConfigured ? "email" : "username"}
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
            <span>{supabaseConfigured ? 'Contas de Acesso Supabase' : 'Acessos de Teste (Padrão)'}</span>
          </div>
          {supabaseConfigured ? (
            <p className="text-xs text-[#b5bac1] leading-relaxed">
              Utilize o e-mail e a senha cadastrados no seu projeto do <strong className="text-white">Supabase Auth</strong>. Certifique-se de que os usuários possuam as permissões adequadas.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#1E1F22] p-3 rounded-lg border border-[#1E1F22]">
              <div>
                <p className="text-[#b5bac1] font-semibold">Administrador:</p>
                <code className="text-[#f2f3f5] font-mono select-all block mt-0.5">admin</code>
                <code className="text-[#f2f3f5] font-mono select-all block">123</code>
              </div>
              <div>
                <p className="text-[#b5bac1] font-semibold">Líder:</p>
                <code className="text-[#f2f3f5] font-mono select-all block mt-0.5">lider</code>
                <code className="text-[#f2f3f5] font-mono select-all block">123</code>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
