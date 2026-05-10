```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT,
    profile_picture_url TEXT,
    karma_score INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);

CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'text' NOT NULL, -- e.g., 'text', 'image', 'video'
    media_url TEXT,
    likes_count INT DEFAULT 0 NOT NULL,
    comments_count INT DEFAULT 0 NOT NULL,
    shares_count INT DEFAULT 0 NOT NULL,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(50) DEFAULT 'published' NOT NULL, -- e.g., 'published', 'draft', 'archived'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts (user_id);
CREATE INDEX idx_posts_created_at ON posts (created_at);
CREATE INDEX idx_posts_status ON posts (status);

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_receiver_id ON messages (receiver_id);
CREATE INDEX idx_messages_sent_at ON messages (sent_at);
CREATE INDEX idx_messages_conversation ON messages (sender_id, receiver_id, sent_at);

CREATE TABLE vault_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    item_type VARCHAR(50) NOT NULL, -- e.g., 'text', 'image', 'document', 'link'
    title VARCHAR(255) NOT NULL,
    content TEXT, -- actual text content or description
    file_url TEXT, -- URL to the actual file/resource
    tags TEXT, -- comma-separated tags or keywords
    is_private BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_vault_items_user_id ON vault_items (user_id);
CREATE INDEX idx_vault_items_created_at ON vault_items (created_at);
CREATE INDEX idx_vault_items_item_type ON vault_items (item_type);

CREATE TABLE tips (
    id BIGSERIAL PRIMARY KEY,
    tipper_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    post_id BIGINT, -- Optional: if the tip is for a specific post
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VOYD' NOT NULL, -- e.g., 'USD', 'VOYD' (app's internal currency)
    message TEXT,
    transaction_id VARCHAR(255), -- Optional external transaction ID
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    FOREIGN KEY (tipper_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE SET NULL
);

CREATE INDEX idx_tips_tipper_id ON tips (tipper_id);
CREATE INDEX idx_tips_receiver_id ON tips (receiver_id);
CREATE INDEX idx_tips_post_id ON tips (post_id);
CREATE INDEX idx_tips_created_at ON tips (created_at);
```
