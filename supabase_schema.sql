-- SQL script para inicializar o banco de dados do Guild Manager no Supabase
-- Como usar:
-- 1. Acesse o Painel do seu Supabase (https://supabase.com)
-- 2. Entre no seu projeto "zeqyvgtzrbmfsopyimzi"
-- 3. No menu lateral esquerdo, clique em "SQL Editor"
-- 4. Clique em "New Query" (Nova Consulta)
-- 5. Cole o código abaixo e clique em "Run" (Executar) no canto inferior direito.

CREATE TABLE IF NOT EXISTS public.guild_data (
    id TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.guild_data ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso simplificadas para permitir leitura e escrita pela Anon Key
CREATE POLICY "Permitir leitura pública para guild_data" 
ON public.guild_data FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção pública para guild_data" 
ON public.guild_data FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública para guild_data" 
ON public.guild_data FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Inserir dados de exemplo iniciais caso a tabela esteja vazia
-- (O servidor Node fará isso automaticamente na primeira conexão, mas você pode garantir rodando este script)
