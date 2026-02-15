-- База данных для Народного Рейтинга Удмуртии
-- PostgreSQL 14+

-- Создание базы данных (выполнить от postgres user)
-- CREATE DATABASE rating_db ENCODING 'UTF8';

-- Подключиться к БД
\c rating_db;

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Для полнотекстового поиска

-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sber_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Таблица категорий
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица кандидатов
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    photo_url VARCHAR(500),
    contact_info VARCHAR(255),
    nominated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT description_length CHECK (LENGTH(description) >= 50 AND LENGTH(description) <= 2000)
);

-- Таблица голосов
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    CONSTRAINT unique_user_candidate_vote UNIQUE (user_id, candidate_id)
);

-- Таблица администраторов
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"moderate": true, "manage_users": false, "manage_admins": false}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Таблица логов действий (аудит)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица настроек системы
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Индексы для производительности
CREATE INDEX idx_users_sber_id ON users(sber_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_category ON candidates(category_id);
CREATE INDEX idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX idx_candidates_full_name ON candidates USING gin(full_name gin_trgm_ops); -- Полнотекстовый поиск

CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_created_at ON votes(created_at DESC);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- View для рейтинга с количеством голосов
CREATE VIEW candidates_with_votes AS
SELECT
    c.id,
    c.full_name,
    c.description,
    c.photo_url,
    cat.name as category_name,
    cat.color as category_color,
    c.created_at,
    c.status,
    COUNT(v.id) as vote_count,
    ROW_NUMBER() OVER (ORDER BY COUNT(v.id) DESC) as rank
FROM candidates c
LEFT JOIN votes v ON c.id = v.candidate_id
LEFT JOIN categories cat ON c.category_id = cat.id
WHERE c.status = 'approved'
GROUP BY c.id, cat.name, cat.color
ORDER BY vote_count DESC;

-- View для статистики
CREATE VIEW platform_stats AS
SELECT
    (SELECT COUNT(*) FROM users WHERE NOT is_blocked) as total_users,
    (SELECT COUNT(*) FROM candidates WHERE status = 'approved') as total_candidates,
    (SELECT COUNT(*) FROM votes) as total_votes,
    (SELECT COUNT(*) FROM candidates WHERE status = 'pending') as pending_candidates,
    (SELECT COUNT(DISTINCT user_id) FROM votes WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as active_users_week;

-- Функция для автоматического логирования действий
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, entity_type, entity_id, details)
        VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (action, entity_type, entity_id, details)
        VALUES (TG_OP, TG_TABLE_NAME, NEW.id, json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (action, entity_type, entity_id, details)
        VALUES (TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для логирования
CREATE TRIGGER audit_candidates
AFTER INSERT OR UPDATE OR DELETE ON candidates
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_votes
AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Пользователи платформы (авторизация через Sber ID)';
COMMENT ON TABLE candidates IS 'Кандидаты на получение народного признания';
COMMENT ON TABLE votes IS 'Голоса пользователей за кандидатов';
COMMENT ON TABLE admins IS 'Администраторы платформы с различными правами';
COMMENT ON TABLE audit_log IS 'Журнал всех действий для аудита';

-- Вставка базовых данных
INSERT INTO categories (name, description, icon, color) VALUES
('Образование', 'Педагоги, ученые, просветители', 'bi-book', '#007bff'),
('Культура', 'Деятели искусства, хранители традиций', 'bi-palette', '#6f42c1'),
('Спорт', 'Тренеры, спортсмены, организаторы', 'bi-trophy', '#fd7e14'),
('Бизнес', 'Предприниматели, создающие рабочие места', 'bi-briefcase', '#28a745'),
('Благотворительность', 'Волонтеры, организаторы социальных акций', 'bi-heart', '#dc3545'),
('Экология', 'Защитники природы, эко-активисты', 'bi-tree', '#20c997');

-- Начальные настройки
INSERT INTO settings (key, value, description) VALUES
('voting_enabled', 'true', 'Включено ли голосование на платформе'),
('nomination_enabled', 'true', 'Могут ли пользователи номинировать кандидатов'),
('votes_per_day_limit', '50', 'Максимум голосов от одного пользователя в день'),
('auto_approve', 'false', 'Автоматическое одобрение кандидатов без модерации');

-- Права доступа
GRANT SELECT ON candidates_with_votes TO rating_app;
GRANT SELECT ON platform_stats TO rating_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO rating_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO rating_app;
