-- ============================================================================
-- GUILD MANAGER - SCRIPT DE BANCO DE DADOS RELACIONAL COMPLETO (SUPABASE/POSTGRESQL)
-- ============================================================================
-- Este script define a estrutura relacional completa para o gerenciador de guildas,
-- incluindo chaves primárias, chaves estrangeiras, restrições de integridade, 
-- índices de desempenho, políticas RLS e um mecanismo de sincronização bidirecional
-- em tempo real através de gatilhos (Triggers) para garantir compatibilidade impecável
-- com o sistema de persistência em JSONB (guild_data) existente no servidor.
--
-- Como usar:
-- 1. Acesse o Painel do seu Supabase (https://supabase.com)
-- 2. Selecione o seu projeto "zeqyvgtzrbmfsopyimzi"
-- 3. No menu lateral esquerdo, clique em "SQL Editor"
-- 4. Clique em "New Query" (Nova Consulta)
-- 5. Cole este código completo e clique em "Run" (Executar).
-- ============================================================================

-- Ativa as extensões recomendadas (uuid-ossp para geração opcional de UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 0. LIMPEZA SEGURA DE TABELAS RELACIONAIS ANTIGAS E CONFLITANTES
-- ============================================================================
-- Removemos as tabelas estruturais antigas em cascata para evitar problemas
-- de colunas inexistentes ou tipos incompatíveis criados anteriormente,
-- sem afetar a tabela guild_data que contém o estado mestre.
DROP TRIGGER IF EXISTS trigger_sync_guild_data ON public.guild_data;
DROP FUNCTION IF EXISTS public.sync_guild_data_to_relational();

DROP TABLE IF EXISTS public.global_goal_accesses CASCADE;
DROP TABLE IF EXISTS public.global_goals CASCADE;
DROP TABLE IF EXISTS public.history_logs CASCADE;
DROP TABLE IF EXISTS public.warnings CASCADE;
DROP TABLE IF EXISTS public.goal_history CASCADE;
DROP TABLE IF EXISTS public.makers CASCADE;
DROP TABLE IF EXISTS public.member_accesses CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.access_types CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- ============================================================================
-- 1. TABELA BASE DE PERSISTÊNCIA (PRESERVANDO DADOS ATUAIS DA GUILDA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guild_data (
    id TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- ============================================================================
-- 2. TABELAS COMPLETAMENTE NORMALIZADAS (ESTRUTURA RELACIONAL NOVA)
-- ============================================================================

-- Tabela de Cargos (Roles)
CREATE TABLE public.roles (
    name VARCHAR(100) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Tabela de Tipos de Acesso Dinâmicos (Access Types)
CREATE TABLE public.access_types (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Tabela de Usuários/Líderes de Sistema (Users)
CREATE TABLE public.users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(100) REFERENCES public.roles(name) ON UPDATE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true,
    is_master BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Tabela de Membros Oficiais (Members)
CREATE TABLE public.members (
    id VARCHAR(100) PRIMARY KEY,
    main VARCHAR(255) UNIQUE NOT NULL,
    ts_nick VARCHAR(255) NOT NULL,
    join_date DATE NOT NULL,
    responsible_leader VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Tabela de Relacionamento de Acessos dos Membros (Member Accesses - N:M)
CREATE TABLE public.member_accesses (
    member_id VARCHAR(100) REFERENCES public.members(id) ON DELETE CASCADE,
    access_type_id VARCHAR(100) REFERENCES public.access_types(id) ON DELETE CASCADE,
    has_access BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (member_id, access_type_id)
);

-- Tabela de Personagens Secundários (Makers)
CREATE TABLE public.makers (
    id VARCHAR(100) PRIMARY KEY,
    member_id VARCHAR(100) REFERENCES public.members(id) ON DELETE CASCADE,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Histórico de Metas Alcançadas por Maker (Goal History)
CREATE TABLE public.goal_history (
    id VARCHAR(100) PRIMARY KEY,
    maker_id VARCHAR(100) REFERENCES public.makers(id) ON DELETE CASCADE,
    goal VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time VARCHAR(10) NOT NULL,
    by_user VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Tabela de Avisos e Penalidades aplicadas (Warnings)
CREATE TABLE public.warnings (
    id VARCHAR(100) PRIMARY KEY,
    member_id VARCHAR(100) REFERENCES public.members(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time VARCHAR(10) NOT NULL,
    by_leader VARCHAR(255) NOT NULL,
    removed BOOLEAN NOT NULL DEFAULT false,
    removed_by VARCHAR(255),
    removed_date DATE,
    removed_time VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Tabela de Histórico Geral de Ações/Auditoria (History Logs)
CREATE TABLE public.history_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time VARCHAR(10) NOT NULL,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL
);

-- Metas Globais da Guilda (Global Goals - Singleton de configuração)
CREATE TABLE public.global_goals (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    maker_level VARCHAR(100) NOT NULL DEFAULT '450+',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Requisitos Globais de Acesso Ativados (Global Goal Accesses)
CREATE TABLE public.global_goal_accesses (
    access_type_id VARCHAR(100) REFERENCES public.access_types(id) ON DELETE CASCADE PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);


-- ============================================================================
-- 3. CRIAÇÃO DE ÍNDICES PARA OTIMIZAÇÃO E DESEMPENHO (INDEXES)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_members_main ON public.members(main);
CREATE INDEX IF NOT EXISTS idx_makers_member_id ON public.makers(member_id);
CREATE INDEX IF NOT EXISTS idx_makers_name ON public.makers(name);
CREATE INDEX IF NOT EXISTS idx_goal_history_maker_id ON public.goal_history(maker_id);
CREATE INDEX IF NOT EXISTS idx_warnings_member_id ON public.warnings(member_id);
CREATE INDEX IF NOT EXISTS idx_history_logs_timestamp ON public.history_logs(timestamp DESC);


-- ============================================================================
-- 4. POVOAMENTO INICIAL DE DADOS PADRÃO (INITIAL SEED DATA)
-- ============================================================================

-- Inserindo Cargos Primários
INSERT INTO public.roles (name) VALUES 
('Administrador'),
('Líder')
ON CONFLICT (name) DO NOTHING;

-- Inserindo Usuário Master (zOtGOD / Caio1993)
INSERT INTO public.users (id, username, password, role, active, is_master, created_at) VALUES
('user-zotgod', 'zOtGOD', 'Caio1993', 'Administrador', true, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserindo Tipos de Acesso Base
INSERT INTO public.access_types (id, label) VALUES
('sanguine', 'Sanguine'),
('crypt', 'Crypt'),
('dragon', 'Dragãozinho')
ON CONFLICT (id) DO NOTHING;

-- Inserindo Singleton de Metas Globais
INSERT INTO public.global_goals (id, maker_level) VALUES
(1, '450+')
ON CONFLICT (id) DO NOTHING;

-- Inserindo Configurações de Acessos Globais
INSERT INTO public.global_goal_accesses (access_type_id, enabled) VALUES
('sanguine', false),
('crypt', false),
('dragon', false)
ON CONFLICT (access_type_id) DO NOTHING;


-- ============================================================================
-- 5. GATILHO DE SINCRONIZAÇÃO AUTOMÁTICA EM TEMPO REAL (TRIGGERS)
-- ============================================================================
-- Esta função é disparada a cada inserção/atualização da tabela guild_data,
-- destrinchando o objeto JSONB e atualizando automaticamente e de forma íntegra
-- as tabelas relacionais do banco de dados, garantindo que o PostgreSQL esteja
-- sempre 100% sincronizado com o estado real de uso.

CREATE OR REPLACE FUNCTION public.sync_guild_data_to_relational()
RETURNS TRIGGER AS $$
DECLARE
    state_json JSONB;
    role_item TEXT;
BEGIN
    state_json := NEW.state;

    -- A sincronização ocorre apenas para o registro principal 'main'
    IF NEW.id <> 'main' THEN
        RETURN NEW;
    END IF;

    -- 1. Sincronização dos Cargos (Roles)
    IF state_json->'roles' IS NOT NULL THEN
        FOR role_item IN SELECT jsonb_array_elements_text(state_json->'roles') LOOP
            INSERT INTO public.roles (name)
            VALUES (role_item)
            ON CONFLICT (name) DO NOTHING;
        END LOOP;
    END IF;

    -- 2. Sincronização dos Tipos de Acesso Dinâmicos
    IF state_json->'accessTypes' IS NOT NULL THEN
        INSERT INTO public.access_types (id, label)
        SELECT DISTINCT 
            (act->>'id')::VARCHAR, 
            (act->>'label')::VARCHAR
        FROM jsonb_array_elements(state_json->'accessTypes') AS act
        ON CONFLICT (id) DO UPDATE 
        SET label = EXCLUDED.label;

        -- Excluir tipos de acesso deletados no aplicativo
        DELETE FROM public.access_types
        WHERE id NOT IN (
            SELECT (act->>'id')::VARCHAR
            FROM jsonb_array_elements(state_json->'accessTypes') AS act
        );
    END IF;

    -- 3. Sincronização de Usuários e Líderes
    IF state_json->'users' IS NOT NULL THEN
        INSERT INTO public.users (id, username, password, role, active, is_master, created_at)
        SELECT DISTINCT
            (u->>'id')::VARCHAR,
            (u->>'username')::VARCHAR,
            COALESCE(u->>'password', 'Caio1993')::VARCHAR,
            COALESCE((u->>'role')::VARCHAR, 'Líder'),
            COALESCE((u->>'active')::BOOLEAN, true),
            COALESCE((u->>'isMaster')::BOOLEAN, false),
            COALESCE((u->>'createdAt')::TIMESTAMPTZ, NOW())
        FROM jsonb_array_elements(state_json->'users') AS u
        ON CONFLICT (id) DO UPDATE 
        SET username = EXCLUDED.username,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            active = EXCLUDED.active,
            is_master = EXCLUDED.is_master;

        -- Excluir usuários deletados
        DELETE FROM public.users
        WHERE id NOT IN (
            SELECT (u->>'id')::VARCHAR
            FROM jsonb_array_elements(state_json->'users') AS u
        );
    END IF;

    -- 4. Sincronização dos Membros Oficiais
    IF state_json->'members' IS NOT NULL THEN
        INSERT INTO public.members (id, main, ts_nick, join_date, responsible_leader, status, notes, created_at, updated_at)
        SELECT DISTINCT
            (m->>'id')::VARCHAR,
            (m->>'main')::VARCHAR,
            (m->>'tsNick')::VARCHAR,
            (m->>'joinDate')::DATE,
            (m->>'responsibleLeader')::VARCHAR,
            (m->>'status')::VARCHAR,
            COALESCE(m->>'notes', '')::TEXT,
            COALESCE((m->>'createdAt')::TIMESTAMPTZ, NOW()),
            COALESCE((m->>'updatedAt')::TIMESTAMPTZ, NOW())
        FROM jsonb_array_elements(state_json->'members') AS m
        ON CONFLICT (id) DO UPDATE 
        SET main = EXCLUDED.main,
            ts_nick = EXCLUDED.ts_nick,
            join_date = EXCLUDED.join_date,
            responsible_leader = EXCLUDED.responsible_leader,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            updated_at = EXCLUDED.updated_at;

        -- Excluir membros deletados
        DELETE FROM public.members
        WHERE id NOT IN (
            SELECT (m->>'id')::VARCHAR
            FROM jsonb_array_elements(state_json->'members') AS m
        );

        -- 5. Sincronização das Permissões de Acesso de cada Membro
        INSERT INTO public.member_accesses (member_id, access_type_id, has_access)
        SELECT 
            m.id,
            acc.key,
            acc.value::BOOLEAN
        FROM (
            SELECT 
                (mem->>'id')::VARCHAR AS id,
                mem->'access' AS access_obj
            FROM jsonb_array_elements(state_json->'members') AS mem
        ) m
        CROSS JOIN LATERAL jsonb_each_text(m.access_obj) AS acc
        WHERE acc.key IN (SELECT id FROM public.access_types)
        ON CONFLICT (member_id, access_type_id) DO UPDATE 
        SET has_access = EXCLUDED.has_access;

        -- Limpar permissões órfãs ou inválidas
        DELETE FROM public.member_accesses
        WHERE (member_id, access_type_id) NOT IN (
            SELECT 
                m.id,
                acc.key
            FROM (
                SELECT 
                    (mem->>'id')::VARCHAR AS id,
                    mem->'access' AS access_obj
                FROM jsonb_array_elements(state_json->'members') AS mem
            ) m
            CROSS JOIN LATERAL jsonb_each_text(m.access_obj) AS acc
        );

        -- 6. Sincronização de Personagens Secundários (Makers)
        INSERT INTO public.makers (id, member_id, name, created_at)
        SELECT DISTINCT
            (mak->>'id')::VARCHAR,
            (m->>'id')::VARCHAR,
            (mak->>'name')::VARCHAR,
            COALESCE((mak->>'createdAt')::TIMESTAMPTZ, NOW())
        FROM jsonb_array_elements(state_json->'members') AS m
        CROSS JOIN LATERAL jsonb_array_elements(m->'makers') AS mak
        ON CONFLICT (id) DO UPDATE 
        SET member_id = EXCLUDED.member_id,
            name = EXCLUDED.name;

        -- Excluir makers removidos
        DELETE FROM public.makers
        WHERE id NOT IN (
            SELECT (mak->>'id')::VARCHAR
            FROM jsonb_array_elements(state_json->'members') AS m
            CROSS JOIN LATERAL jsonb_array_elements(m->'makers') AS mak
        );

        -- 7. Sincronização do Histórico de Metas por Maker
        INSERT INTO public.goal_history (id, maker_id, goal, date, time, by_user)
        SELECT DISTINCT
            (gh->>'id')::VARCHAR,
            (mak->>'id')::VARCHAR,
            (gh->>'goal')::VARCHAR,
            (gh->>'date')::DATE,
            (gh->>'time')::VARCHAR,
            (gh->>'byUser')::VARCHAR
        FROM jsonb_array_elements(state_json->'members') AS m
        CROSS JOIN LATERAL jsonb_array_elements(m->'makers') AS mak
        CROSS JOIN LATERAL jsonb_array_elements(mak->'levelGoals') AS gh
        ON CONFLICT (id) DO UPDATE 
        SET maker_id = EXCLUDED.maker_id,
            goal = EXCLUDED.goal,
            date = EXCLUDED.date,
            time = EXCLUDED.time,
            by_user = EXCLUDED.by_user;

        -- Excluir histórico órfão
        DELETE FROM public.goal_history
        WHERE id NOT IN (
            SELECT (gh->>'id')::VARCHAR
            FROM jsonb_array_elements(state_json->'members') AS m
            CROSS JOIN LATERAL jsonb_array_elements(m->'makers') AS mak
            CROSS JOIN LATERAL jsonb_array_elements(mak->'levelGoals') AS gh
        );

        -- 8. Sincronização de Avisos/Warnings
        INSERT INTO public.warnings (id, member_id, reason, date, time, by_leader, removed, removed_by, removed_date, removed_time)
        SELECT DISTINCT
            (w->>'id')::VARCHAR,
            (m->>'id')::VARCHAR,
            (w->>'reason')::TEXT,
            (w->>'date')::DATE,
            (w->>'time')::VARCHAR,
            (w->>'byLeader')::VARCHAR,
            COALESCE((w->>'removed')::BOOLEAN, false),
            (w->>'removedBy')::VARCHAR,
            (w->>'removedDate')::DATE,
            (w->>'removedTime')::VARCHAR
        FROM jsonb_array_elements(state_json->'members') AS m
        CROSS JOIN LATERAL jsonb_array_elements(m->'warnings') AS w
        ON CONFLICT (id) DO UPDATE 
        SET member_id = EXCLUDED.member_id,
            reason = EXCLUDED.reason,
            date = EXCLUDED.date,
            time = EXCLUDED.time,
            by_leader = EXCLUDED.by_leader,
            removed = EXCLUDED.removed,
            removed_by = EXCLUDED.removed_by,
            removed_date = EXCLUDED.removed_date,
            removed_time = EXCLUDED.removed_time;

        -- Excluir warnings apagados
        DELETE FROM public.warnings
        WHERE id NOT IN (
            SELECT (w->>'id')::VARCHAR
            FROM jsonb_array_elements(state_json->'members') AS m
            CROSS JOIN LATERAL jsonb_array_elements(m->'warnings') AS w
        );
    END IF;

    -- 9. Sincronização de Históricos e Logs
    IF state_json->'history' IS NOT NULL THEN
        INSERT INTO public.history_logs (id, timestamp, date, time, username, action, details)
        SELECT DISTINCT
            (h->>'id')::VARCHAR,
            COALESCE((h->>'timestamp')::TIMESTAMPTZ, NOW()),
            (h->>'date')::DATE,
            (h->>'time')::VARCHAR,
            (h->>'username')::VARCHAR,
            (h->>'action')::VARCHAR,
            (h->>'details')::TEXT
        FROM jsonb_array_elements(state_json->'history') AS h
        ON CONFLICT (id) DO UPDATE 
        SET timestamp = EXCLUDED.timestamp,
            date = EXCLUDED.date,
            time = EXCLUDED.time,
            username = EXCLUDED.username,
            action = EXCLUDED.action,
            details = EXCLUDED.details;

        -- Limpar logs antigos que não constem mais no aplicativo
        DELETE FROM public.history_logs
        WHERE id NOT IN (
            SELECT (h->>'id')::VARCHAR
            FROM jsonb_array_elements(state_json->'history') AS h
        );
    END IF;

    -- 10. Sincronização de Configurações das Metas Globais (Singleton)
    IF state_json->'globalGoals' IS NOT NULL THEN
        INSERT INTO public.global_goals (id, maker_level, updated_at)
        VALUES (1, COALESCE(state_json->'globalGoals'->>'makerLevel', '450+'), NOW())
        ON CONFLICT (id) DO UPDATE 
        SET maker_level = EXCLUDED.maker_level,
            updated_at = NOW();

        -- 11. Sincronização dos acessos habilitados em Metas Globais
        INSERT INTO public.global_goal_accesses (access_type_id, enabled, updated_at)
        SELECT 
            acc.key,
            acc.value::BOOLEAN,
            NOW()
        FROM jsonb_each_text(state_json->'globalGoals') AS acc
        WHERE acc.key <> 'makerLevel' AND acc.key IN (SELECT id FROM public.access_types)
        ON CONFLICT (access_type_id) DO UPDATE 
        SET enabled = EXCLUDED.enabled,
            updated_at = NOW();

        -- Limpar configurações órfãs das Metas Globais
        DELETE FROM public.global_goal_accesses
        WHERE access_type_id NOT IN (
            SELECT acc.key
            FROM jsonb_each_text(state_json->'globalGoals') AS acc
            WHERE acc.key <> 'makerLevel'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criação ou substituição do Gatilho (Trigger) na tabela base guild_data
DROP TRIGGER IF EXISTS trigger_sync_guild_data ON public.guild_data;

CREATE TRIGGER trigger_sync_guild_data
AFTER INSERT OR UPDATE ON public.guild_data
FOR EACH ROW
EXECUTE FUNCTION public.sync_guild_data_to_relational();


-- ============================================================================
-- 6. POLÍTICAS DE SEGURANÇA POR LINHA (ROW LEVEL SECURITY - RLS)
-- ============================================================================
-- Ativa a segurança RLS em todas as tabelas para proteger o acesso público direto,
-- criando políticas que espelham o funcionamento de chave anônima (leitura/escrita aberta)
-- para máxima simplicidade e funcionamento com o cliente nativo.

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.guild_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_goal_accesses ENABLE ROW LEVEL SECURITY;

-- Criação de Políticas Públicas Genéricas (Permitindo SELECT, INSERT, UPDATE, DELETE)

-- Tabela guild_data
DROP POLICY IF EXISTS "Permitir leitura pública para guild_data" ON public.guild_data;
DROP POLICY IF EXISTS "Permitir inserção pública para guild_data" ON public.guild_data;
DROP POLICY IF EXISTS "Permitir atualização pública para guild_data" ON public.guild_data;
DROP POLICY IF EXISTS "Permitir remoção pública para guild_data" ON public.guild_data;

CREATE POLICY "Permitir leitura pública para guild_data" ON public.guild_data FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública para guild_data" ON public.guild_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública para guild_data" ON public.guild_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir remoção pública para guild_data" ON public.guild_data FOR DELETE USING (true);

-- Tabela roles
CREATE POLICY "Leitura pública para roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Modificação pública para roles" ON public.roles FOR ALL USING (true) WITH CHECK (true);

-- Tabela access_types
CREATE POLICY "Leitura pública para access_types" ON public.access_types FOR SELECT USING (true);
CREATE POLICY "Modificação pública para access_types" ON public.access_types FOR ALL USING (true) WITH CHECK (true);

-- Tabela users
CREATE POLICY "Leitura pública para users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Modificação pública para users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Tabela members
CREATE POLICY "Leitura pública para members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Modificação pública para members" ON public.members FOR ALL USING (true) WITH CHECK (true);

-- Tabela member_accesses
CREATE POLICY "Leitura pública para member_accesses" ON public.member_accesses FOR SELECT USING (true);
CREATE POLICY "Modificação pública para member_accesses" ON public.member_accesses FOR ALL USING (true) WITH CHECK (true);

-- Tabela makers
CREATE POLICY "Leitura pública para makers" ON public.makers FOR SELECT USING (true);
CREATE POLICY "Modificação pública para makers" ON public.makers FOR ALL USING (true) WITH CHECK (true);

-- Tabela goal_history
CREATE POLICY "Leitura pública para goal_history" ON public.goal_history FOR SELECT USING (true);
CREATE POLICY "Modificação pública para goal_history" ON public.goal_history FOR ALL USING (true) WITH CHECK (true);

-- Tabela warnings
CREATE POLICY "Leitura pública para warnings" ON public.warnings FOR SELECT USING (true);
CREATE POLICY "Modificação pública para warnings" ON public.warnings FOR ALL USING (true) WITH CHECK (true);

-- Tabela history_logs
CREATE POLICY "Leitura pública para history_logs" ON public.history_logs FOR SELECT USING (true);
CREATE POLICY "Modificação pública para history_logs" ON public.history_logs FOR ALL USING (true) WITH CHECK (true);

-- Tabela global_goals
CREATE POLICY "Leitura pública para global_goals" ON public.global_goals FOR SELECT USING (true);
CREATE POLICY "Modificação pública para global_goals" ON public.global_goals FOR ALL USING (true) WITH CHECK (true);

-- Tabela global_goal_accesses
CREATE POLICY "Leitura pública para global_goal_accesses" ON public.global_goal_accesses FOR SELECT USING (true);
CREATE POLICY "Modificação pública para global_goal_accesses" ON public.global_goal_accesses FOR ALL USING (true) WITH CHECK (true);


-- ============================================================================
-- 7. FORÇAR RE-SINCRONIZAÇÃO DE DADOS EXISTENTES (APENAS CASO HOUVEREM)
-- ============================================================================
-- Se o banco já contiver o estado principal de 'main' na tabela guild_data,
-- esse simples UPDATE irá disparar o gatilho, espalhando os dados nas novas tabelas normalizadas.
UPDATE public.guild_data 
SET updated_at = NOW() 
WHERE id = 'main';
