As a world-class software architect, I'm thrilled to lay out the blueprint for Void, an ambitious platform that seamlessly blends the virality of TikTok, the intelligence of Grok, and the privacy of Signal-powered encrypted groups. Our focus will be on cutting-edge encryption, scalable architecture, and a truly intelligent user experience.

---

## Void App Architecture: TikTok + Grok + Encrypted Facebook Groups

**Core Principles:**
1.  **Privacy-by-Design:** End-to-End Encryption (E2EE) for all personal and group communications.
2.  **AI-Native:** AI deeply integrated into content creation, consumption, and interaction.
3.  **Scalability:** Designed for global reach and high concurrency, especially for video and real-time messaging.
4.  **Performance:** Optimized for a smooth and responsive user experience across devices.
5.  **Security:** Proactive measures against known and emerging threats, including post-quantum resilience.

**Tech Stack Summary:**
*   **Frontend:** React Native (iOS, Android)
*   **Backend:** Go (for high performance, concurrency, and robust microservices) or Node.js (for rapid development and event-driven architecture). *Given the requirements, Go is preferred for its performance, concurrency handling, and type safety, especially for real-time and security-critical components.*
*   **Database:** PostgreSQL (primary data store, leveraging JSONB for flexible schema needs)
*   **Real-time:** WebSockets (Go's `goroutines` are excellent for this)
*   **Media Storage:** AWS S3 or Google Cloud Storage
*   **Message Queue:** Kafka or RabbitMQ (for async processing, e.g., video encoding, notifications, AI tasks)
*   **Cache:** Redis (session management, hot data, rate limiting)
*   **Blockchain:** Solana (for tips and potentially decentralized identity components in the future)
*   **AI Models:** Google Gemini API, dedicated Text-to-Video APIs (e.g., Google Imagen Video, RunwayML, or a fine-tuned open-source model)

---

### 1. Database Schema (PostgreSQL)

We'll use a relational model with careful consideration for indexes and foreign keys to ensure data integrity and query performance. JSONB fields will be used for flexible metadata.

**Schema Design Principles:**
*   **UUIDs:** Use UUIDs for primary keys for better distribution and sharding potential.
*   **Timestamps:** `created_at` and `updated_at` (with `DEFAULT NOW()` and `ON UPDATE NOW()`) on most tables.
*   **Indexes:** B-tree indexes on foreign keys, `created_at`, and frequently queried columns. Partial indexes where applicable.

---

```sql
-- Core Schema for Void App

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash BYTEA NOT NULL, -- Stored as bcrypt or argon2 hash
    profile_picture_url TEXT,
    bio TEXT,
    solana_wallet_address VARCHAR(255) UNIQUE, -- Public key for Solana
    e2ee_identity_key TEXT NOT NULL, -- Public identity key for E2EE (e.g., Signal Protocol)
    device_fingerprints JSONB, -- Stores public device keys for key management
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

-- User Sessions (for authentication)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- Followers/Following
CREATE TABLE user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);
CREATE INDEX idx_user_follows_follower_id ON user_follows (follower_id);
CREATE INDEX idx_user_follows_followee_id ON user_follows (followee_id);

-- Posts Table (Video, Image, Text)
CREATE TYPE post_type_enum AS ENUM ('video', 'image', 'text', 'ai_generated_video');
CREATE TYPE post_visibility_enum AS ENUM ('public', 'private', 'group_only');
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_type post_type_enum NOT NULL,
    media_url TEXT, -- URL to S3/GCS bucket for video/image
    thumbnail_url TEXT, -- For video thumbnails
    caption TEXT,
    visibility post_visibility_enum DEFAULT 'public',
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL, -- Null for public posts
    ai_metadata JSONB, -- Stores AI generation prompts, models used, quality, etc.
    hashtags TEXT[], -- Array of hashtags for search and discovery
    duration_seconds INT, -- For videos
    views BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_posts_user_id ON posts (user_id);
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_hashtags ON posts USING GIN (hashtags);

-- Likes on Posts
CREATE TABLE post_likes (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- Comments on Posts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested comments
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_comments_post_id ON comments (post_id);
CREATE INDEX idx_comments_user_id ON comments (user_id);
CREATE INDEX idx_comments_parent_id ON comments (parent_comment_id);

-- Groups Table (Encrypted)
CREATE TYPE group_visibility_enum AS ENUM ('public', 'private', 'secret'); -- Public (discoverable), Private (invite-only, discoverable), Secret (invite-only, not discoverable)
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visibility group_visibility_enum DEFAULT 'private',
    profile_picture_url TEXT,
    invite_code VARCHAR(50) UNIQUE, -- For private/secret groups
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_groups_owner_id ON groups (owner_id);
CREATE INDEX idx_groups_name ON groups (name);

-- Group Members
CREATE TYPE group_role_enum AS ENUM ('owner', 'admin', 'member');
CREATE TABLE group_members (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role group_role_enum DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_group_members_group_id ON group_members (group_id);
CREATE INDEX idx_group_members_user_id ON group_members (user_id);

-- Group Messages (E2EE)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- Null for 1:1 DMs or AI chat
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- E2EE fields:
    ciphertext BYTEA NOT NULL, -- Encrypted message content
    sender_ephemeral_key TEXT NOT NULL, -- Sender's ephemeral public key for session setup
    message_metadata JSONB, -- Stores IV, MAC, content type (text, image, video, file, AI_prompt, AI_response)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_by JSONB DEFAULT '{}'::jsonb, -- Store user_id:timestamp for read receipts
    is_deleted BOOLEAN DEFAULT FALSE,
    ai_thread_id UUID, -- Links to an AI conversation thread if this message is part of it
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL -- For replies
);
CREATE INDEX idx_messages_group_id_timestamp ON messages (group_id, timestamp DESC);
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_ai_thread_id ON messages (ai_thread_id);

-- Vault Items (E2EE for files/secrets within groups)
CREATE TABLE vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- e.g., 'document', 'image', 'video', 'secret_note'
    ciphertext_blob BYTEA NOT NULL, -- Encrypted file content or data
    filename VARCHAR(255), -- Original filename for downloads
    filesize_bytes BIGINT,
    metadata JSONB, -- Stores IV, MAC, original_mime_type, checksum, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_vault_items_group_id ON vault_items (group_id);

-- Solana Tips
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- Can tip a user or a specific post
    amount_sol NUMERIC(18, 9) NOT NULL, -- Solana has 9 decimal places
    solana_transaction_hash VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_tips_sender_user_id ON tips (sender_user_id);
CREATE INDEX idx_tips_receiver_user_id ON tips (receiver_user_id);
CREATE INDEX idx_tips_post_id ON tips (post_id);
CREATE INDEX idx_tips_solana_transaction_hash ON tips (solana_transaction_hash);

-- AI Conversation Threads (for Grok-like interactions)
CREATE TABLE ai_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255), -- User-given or auto-generated title for the chat
    context JSONB, -- Stores relevant context/history for the AI session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_ai_threads_user_id ON ai_threads (user_id);
-- AI messages will be stored in the 'messages' table with `ai_thread_id` and specific metadata in `message_metadata`

-- Notifications
CREATE TYPE notification_type_enum AS ENUM (
    'like', 'comment', 'follow', 'group_invite', 'group_message',
    'mention', 'ai_generated_video_ready', 'tip_received'
);
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type_enum NOT NULL,
    message TEXT NOT NULL,
    related_entity_id UUID, -- ID of the post, user, group, etc. that triggered the notification
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);

-- E2EE Key Bundles (Server-side storage of public keys for device synchronization and initial key exchange)
-- This table stores *public* key material only, to facilitate key discovery for E2EE.
-- Private keys are strictly client-side.
CREATE TABLE e2ee_key_bundles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL, -- Unique ID per user device
    -- Signal Protocol v3/v4 bundle:
    identity_key_public TEXT NOT NULL, -- User's long-term identity public key for this device
    signed_prekey_public TEXT NOT NULL, -- Signed prekey public key
    signed_prekey_signature TEXT NOT NULL, -- Signature over the signed prekey
    one_time_prekeys JSONB DEFAULT '[]'::jsonb, -- Array of one-time prekey public keys
    -- MLS Group Key Material (for group membership changes):
    mls_group_key_package JSONB, -- Public key package for MLS groups (contains credential and capabilities)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, device_id)
);
CREATE INDEX idx_e2ee_key_bundles_user_id ON e2ee_key_bundles (user_id);
```

---

### 2. API Endpoints

We'll use a RESTful API for most CRUD operations and a WebSocket API for real-time interactions like chat, live notifications, and potentially video streaming metadata.

**Base URL:** `https://api.voidapp.com/v1`

#### REST API Endpoints

**Authentication & Users**
*   `POST /auth/register`: Register a new user.
*   `POST /auth/login`: Authenticate user, receive JWT (access + refresh tokens).
*   `POST /auth/refresh`: Refresh access token using refresh token.
*   `POST /auth/logout`: Invalidate refresh token.
*   `GET /users/me`: Get current user's profile.
*   `PUT /users/me`: Update current user's profile.
*   `GET /users/{id}`: Get user profile by ID.
*   `GET /users/search?q={query}`: Search for users.
*   `POST /users/{id}/follow`: Follow a user.
*   `DELETE /users/{id}/follow`: Unfollow a user.
*   `GET /users/{id}/followers`: Get followers of a user.
*   `GET /users/{id}/following`: Get users followed by a user.
*   `GET /users/me/wallet`: Get Solana wallet address for the current user.
*   `POST /users/me/wallet`: Link/update Solana wallet address.

**Posts & Feed**
*   `POST /posts`: Create a new post (video, image, text).
    *   *Payload:* `user_id`, `post_type`, `caption`, `visibility`, `group_id` (optional), `media_data` (for direct upload, or `media_url` if pre-uploaded to S3/GCS with signed URL).
*   `GET /posts/{id}`: Get a specific post.
*   `PUT /posts/{id}`: Update a post (e.g., caption, visibility).
*   `DELETE /posts/{id}`: Delete a post.
*   `GET /feed`: Get algorithmic personalized feed (main TikTok-like feed).
    *   *Params:* `limit`, `offset`, `cursor`.
*   `GET /feed/following`: Get chronological feed from followed users.
*   `GET /users/{id}/posts`: Get all posts by a specific user.
*   `POST /posts/{id}/like`: Like a post.
*   `DELETE /posts/{id}/like`: Unlike a post.
*   `GET /posts/{id}/comments`: Get comments for a post.
*   `POST /posts/{id}/comments`: Add a comment to a post.
*   `PUT /comments/{id}`: Update a comment.
*   `DELETE /comments/{id}`: Delete a comment.
*   `GET /posts/trending`: Get trending posts.
*   `GET /posts/hashtags/{tag}`: Get posts by hashtag.

**Groups**
*   `POST /groups`: Create a new group.
    *   *Payload:* `name`, `description`, `visibility`, `profile_picture_url` (optional).
*   `GET /groups/{id}`: Get group details.
*   `PUT /groups/{id}`: Update group details.
*   `DELETE /groups/{id}`: Delete a group (owner only).
*   `GET /groups/me`: Get groups the current user is a member of.
*   `GET /groups/search?q={query}`: Search for public/private groups.
*   `POST /groups/{id}/join`: Request to join a private group / Join a public group.
*   `POST /groups/{id}/invite`: Invite a user to a group (requires `user_id` or `username`).
*   `DELETE /groups/{group_id}/members/{user_id}`: Remove a member from a group (admin/owner only).
*   `PUT /groups/{group_id}/members/{user_id}/role`: Update a member's role.
*   `GET /groups/{id}/members`: Get group members.
*   `GET /groups/{id}/posts`: Get posts shared within a group.

**Group Vault (E2EE)**
*   `POST /groups/{id}/vault`: Upload an encrypted vault item.
    *   *Payload:* `item_type`, `filename`, `ciphertext_blob`, `metadata` (IV, MAC, etc.).
*   `GET /groups/{id}/vault`: List vault items for a group.
*   `GET /groups/{id}/vault/{item_id}`: Get metadata for a specific vault item.
*   `GET /groups/{id}/vault/{item_id}/download`: Get a signed URL to download the encrypted vault item.
*   `DELETE /groups/{id}/vault/{item_id}`: Delete a vault item.

**AI Integration (Grok & Text-to-Video)**
*   `POST /ai/grok/chat`: Initiate a new AI conversation thread.
    *   *Payload:* `user_id`, `initial_prompt`.
    *   *Response:* `ai_thread_id`, initial AI response.
*   `POST /ai/grok/chat/{thread_id}`: Send a message to an existing AI conversation.
    *   *Payload:* `message_content`.
    *   *Response:* AI response (can be streamed via WS or returned as complete).
*   `GET /ai/grok/chat/{thread_id}/history`: Get conversation history for an AI thread.
*   `POST /ai/text-to-video`: Request an AI-generated video.
    *   *Payload:* `prompt_text`, `style_preferences` (optional, e.g., 'anime', 'realistic').
    *   *Response:* `job_id`, `status` (`pending`).
*   `GET /ai/text-to-video/{job_id}`: Check status of AI video generation job.
    *   *Response:* `status` (`pending`, `processing`, `completed`, `failed`), `video_url` (if completed), `post_id` (if already posted).

**Solana Tipping**
*   `POST /tips`: Send a Solana tip.
    *   *Payload:* `receiver_user_id` OR `post_id`, `amount_sol`, `transaction_signature` (from client-side wallet).
*   `GET /tips/me/sent`: Get tips sent by current user.
*   `GET /tips/me/received`: Get tips received by current user.
*   `GET /tips/latest`: Get recent public tips (e.g., for trending posts).

**E2EE Key Management (Secure & Authenticated)**
*   `POST /keys/bundle/upload`: Upload a new device's E2EE key bundle (identity key, signed prekey, one-time prekeys).
    *   *Payload:* `device_id`, `identity_key_public`, `signed_prekey_public`, `signed_prekey_signature`, `one_time_prekeys`.
*   `GET /keys/bundle/{user_id}/{device_id}`: Fetch a specific device's key bundle.
*   `GET /keys/bundle/{user_id}`: Fetch all available key bundles for a user (for multi-device sync).
*   `POST /groups/{group_id}/mls/key_package`: Upload a new MLS KeyPackage for a device in a group (happens on join/rekey).
*   `GET /groups/{group_id}/mls/key_packages`: Fetch all MLS KeyPackages for a group's members.

#### WebSocket API Endpoints

**Main Endpoint:** `wss://api.voidapp.com/ws`

**Connect:**
*   `CONNECT /ws?token={jwt}`: Authenticate WebSocket connection.

**Messages & Chat**
*   `SUBSCRIBE /groups/{id}/messages`: Real-time group messages (encrypted).
    *   *Client sends:* `{"type": "message", "group_id": "...", "ciphertext": "...", "metadata": "..."}`
*   `SUBSCRIBE /users/{id}/messages`: Real-time 1:1 direct messages (encrypted).
    *   *Client sends:* `{"type": "message", "receiver_id": "...", "ciphertext": "...", "metadata": "..."}`
*   `SUBSCRIBE /ai/grok/chat/{thread_id}`: Real-time AI chat responses.
    *   *Client sends:* `{"type": "ai_query", "thread_id": "...", "prompt": "..."}`
*   `EVENT: MESSAGE_RECEIVED`: Server pushes new encrypted messages.
*   `EVENT: MESSAGE_READ`: Server pushes read receipts.
*   `EVENT: TYPING_INDICATOR`: Server pushes typing status.
*   `EVENT: REACTION_ADDED`: Server pushes real-time reactions to messages.

**Notifications**
*   `SUBSCRIBE /notifications`: Real-time general notifications for the user.
*   `EVENT: NEW_NOTIFICATION`: Server pushes new notification objects.

**Feed & Content Updates**
*   `SUBSCRIBE /feed/updates`: Minor real-time updates to the algorithmic feed (e.g., new trending posts, popular posts from followed users).
*   `EVENT: POST_UPDATED`: Server pushes updates for likes, comments count on posts currently in view.

**AI Job Status**
*   `SUBSCRIBE /ai/jobs/{job_id}/status`: Real-time updates on AI generation jobs.
*   `EVENT: AI_JOB_STATUS_UPDATE`: Server pushes `status` changes, and `video_url` on completion.

---

### 3. AI Integration (Gemini, Text-to-Video)

Void's AI capabilities are a cornerstone, making it intelligent and interactive.

**A. Grok-like AI Chat (powered by Google Gemini)**

*   **Architecture:**
    *   **Backend Service:** A dedicated Go microservice `ai-service` will handle all interactions with the Gemini API.
    *   **Request Flow:**
        1.  User sends a prompt from React Native app (`/ai/grok/chat` REST or `WS /ai/grok/chat/{thread_id}`).
        2.  Frontend encrypts the prompt with a secure ephemeral key before sending, ensuring client-side privacy. The backend *cannot* decrypt user prompts. This is a critical distinction from Grok.
        3.  `ai-service` receives the *encrypted* prompt. It retrieves the conversation context (also encrypted if necessary, or summarized client-side) from `ai_threads` table.
        4.  *Decryption Challenge:* To maintain E2EE, the AI cannot directly access plaintext. This requires a novel approach:
            *   **Option 1 (Proxy/Homomorphic Encryption):** Send the encrypted prompt to a specialized AI proxy or use homomorphic encryption (highly complex, not production-ready for general LLMs).
            *   **Option 2 (User Acknowledged Plaintext):** For Grok-like features, the user *explicitly opts-in* to send prompts in plaintext to the AI, knowing it's not E2EE. The AI's response is *then* encrypted for storage and delivery to the user's device. This is the most practical and common approach for AI chat. Void will implement this with clear user consent.
        5.  `ai-service` sends the (user-consented) plaintext prompt and conversation context to Google Gemini API.
        6.  Gemini processes the request and returns a response.
        7.  `ai-service` receives the Gemini response, encrypts it using the user's session key (or a derived key for the AI thread), and stores the *ciphertext* in the `messages` table (linked via `ai_thread_id`).
        8.  `ai-service` pushes the encrypted response via WebSocket to the user's device, which then decrypts and displays it.
*   **Context Management:** For multi-turn conversations, the `ai-service` will maintain a rolling window of recent messages within the `ai_threads.context` JSONB field (or reconstruct from `messages` table) to provide relevant context to Gemini.
*   **Safety & Moderation:** Implement content moderation filters (Gemini's built-in, plus potentially custom filters) to prevent harmful content generation.

**B. Text-to-Video Generation**

*   **Architecture:**
    *   **Backend Service:** `ai-video-service` (another Go microservice).
    *   **Workflow:**
        1.  User submits a text prompt via React Native (`/ai/text-to-video` REST).
        2.  `ai-video-service` receives the prompt.
        3.  A job is created in a message queue (Kafka) for asynchronous processing.
        4.  Worker processes consume from the queue:
            *   Call the chosen Text-to-Video API (e.g., Google Imagen Video, a commercial provider like RunwayML, or a hosted open-source model like Stable Video Diffusion).
            *   Wait for the video generation to complete.
            *   Receive the generated video file.
            *   Upload the video to S3/GCS.
            *   Generate a thumbnail.
            *   Create a `post` entry in the database with `post_type = 'ai_generated_video'`, linking the `media_url` and `ai_metadata` (prompt, model, timestamp).
            *   Update the `ai_threads` or `notifications` table to mark the job as complete and notify the user via WebSocket (`/ai/jobs/{job_id}/status`).
*   **Scalability:** Message queues and worker pools ensure that video generation, which can be computationally intensive and time-consuming, doesn't block user requests.
*   **Monetization/Resource Management:** Consider implementing a credit system or tiered access for T2V features due to their cost.

**C. Algorithmic Feed (TikTok-like)**

*   **Service:** `feed-service` (Go microservice).
*   **ML Model:** Utilize a combination of collaborative filtering, content-based recommendations, and potentially deep learning models (e.g., Two-tower models) to rank and personalize the feed.
*   **Data Inputs:** User interactions (likes, comments, shares, views, time spent), follower graph, content metadata (hashtags, categories, AI-generated tags), time of day, current trends.
*   **Real-time & Batch:** Batch processing for general model training, real-time feature engineering for immediate user context.
*   **API:** `GET /feed` provides a continuous stream of personalized content.

---

### 4. Encryption Architecture (Post-Quantum, MLS, Signal)

This is the most critical and complex part, given the "encrypted groups" and "Post-Quantum" mandate. We'll build upon established protocols and integrate PQC.

**Core Principles:**
*   **End-to-End Encryption (E2EE):** No server ever sees plaintext messages or vault item content.
*   **Forward Secrecy:** Compromise of long-term keys does not compromise past communications.
*   **Future Secrecy (Post-Compromise Security):** Compromise of session keys does not compromise future communications.
*   **Multi-Device Support:** Seamless E2EE across all user devices.
*   **Post-Quantum Cryptography (PQC):** Hybrid approach to protect against future quantum computer threats.

**Components:**

1.  **Identity & Device Keys:**
    *   Each user has a long-term **Identity Key Pair** (e.g., Curve25519 + Kyber for PQC hybrid). This key identifies the user across devices.
    *   Each user's **device** also has its own Identity Key Pair (Curve25519 + Kyber).
    *   These public identity keys are stored in `users.e2ee_identity_key` and `e2ee_key_bundles.identity_key_public`. Private keys *never* leave the user's device.

2.  **Signal Protocol for 1:1 DMs and Initial Key Exchange:**
    *   **Extended Triple Diffie-Hellman (X3DH) Key Agreement:** Used to establish a secure, mutually authenticated session key between two devices.
        *   **Hybrid PQC Integration:** When performing X3DH, instead of just using Curve25519, we'll combine it with a PQC Key Encapsulation Mechanism (KEM) like **Kyber**.
            *   Alice sends her Curve25519 ephemeral public key + Kyber ciphertext (encapsulating a symmetric key) to Bob.
            *   Bob uses his Kyber private key to decapsulate the symmetric key.
            *   The final shared secret is derived from *both* the Curve25519 DH shared secret *and* the Kyber-derived symmetric key. This ensures that even if one component is broken (e.g., Curve25519 by quantum computers), the other still provides security.
    *   **Double Ratchet Algorithm:** Once an X3DH session is established, the Double Ratchet continuously evolves session keys for every message, providing forward and future secrecy.
        *   **Message Encryption:** Messages are encrypted using AES-256 GCM with keys derived from the Double Ratchet.
        *   **Authentication:** Message Authentication Codes (MACs) are used (e.g., HMAC-SHA256) to prevent tampering.

3.  **Message Layer Security (MLS) for Group E2EE:**
    *   MLS is the next-generation standard for efficient, scalable, and secure group messaging. It provides E2EE for groups with excellent properties like forward secrecy, post-compromise security, and efficient rekeying.
    *   **Key Tree:** MLS uses a tree-based key derivation system. Each member holds a partial view of the tree, allowing efficient updates.
    *   **Group Creation:**
        1.  The group creator generates an MLS KeyPackage.
        2.  Other invited members also generate KeyPackages.
        3.  The creator forms the initial group, adding members and updating the key tree.
        4.  Public KeyPackages are uploaded to the `e2ee_key_bundles` table, specifically `mls_group_key_package` field.
    *   **Membership Changes (Join/Leave):**
        *   MLS efficiently rekeys the group without requiring all members to perform a full DH exchange. The tree structure allows a small number of key updates to affect all group members.
        *   **PQC Integration:** The underlying cryptographic primitives for MLS (e.g., key agreement, signatures for tree updates) will also use the PQC hybrid approach (e.g., Kyber for KEMs, Dilithium for signatures) to protect against quantum attacks on group key establishment and integrity.
    *   **Message Encryption:** Group messages are encrypted using a symmetric group key derived from the MLS key tree, typically AES-256 GCM.
    *   **Server Role:** The server only ever stores and transmits encrypted MLS messages and public key packages. It acts as a dumb relay, facilitating key exchange and message delivery without ever decrypting content.

4.  **Vault Item Encryption:**
    *   Vault items are encrypted using the *current symmetric group key* (derived from MLS) for the specific group.
    *   When a vault item is uploaded, the client encrypts it, generates a MAC, and sends the `ciphertext_blob`, `metadata` (IV, MAC, filename, content type) to the server.
    *   The server stores this encrypted blob in the `vault_items` table.
    *   When downloaded, the client retrieves the blob, decrypts it using the current group key, and verifies the MAC.

5.  **Post-Quantum Cryptography (PQC) Integration Strategy:**
    *   **Hybrid Approach:** This is the current best practice. We'll layer PQC algorithms *on top* of well-established classical algorithms.
        *   For Key Exchange (X3DH, MLS KEMs): Combine **Curve25519 (classical DH)** with **Kyber (PQC KEM)**. The final shared secret is `KDF(DH_shared_secret || Kyber_derived_secret)`. This provides security against both classical and quantum adversaries. If either component fails, the other provides fallback security.
        *   For Digital Signatures (identity keys, prekey signatures, MLS tree updates): Combine **Ed25519 (classical signature)** with **Dilithium (PQC signature)**. A signature would be a concatenation of `Ed25519(message) || Dilithium(message)`.
    *   **Key Rollout:** PQC will be rolled out strategically. Initially, existing users' devices will generate new hybrid key pairs. New users will generate hybrid key pairs by default.
    *   **Client-Side Implementation:** The complexity of hybrid PQC will primarily reside within a robust, tested cryptographic library integrated into the React Native client (e.g., using native modules for Rust/C++ implementations like OpenSSL/liboqs or custom bindings).

**Key Management & Storage:**
*   **Private Keys:** *Never* leave the client device. They are generated and stored securely in the device's secure enclave (iOS) or AndroidKeyStore, or encrypted with a strong passphrase.
*   **Public Keys:** Stored on the server in `users` and `e2ee_key_bundles` tables to facilitate key discovery for new sessions.
*   **Session Keys:** Ephemeral, derived on-the-fly, and never stored persistently on the server or even long-term on the client.

**Encryption Flow Summary:**

*   **User Registration:** Generate hybrid identity key pair (Curve25519+Kyber), upload public key to `users.e2ee_identity_key`.
*   **Device Onboarding:** Generate new hybrid identity key pair for the device, and a new Signal prekey bundle (with hybrid X3DH components), upload public keys to `e2ee_key_bundles`.
*   **1:1 Message:**
    1.  Sender retrieves receiver's public key bundle from `e2ee_key_bundles`.
    2.  Sender performs hybrid X3DH to establish an initial symmetric session key.
    3.  Sender and receiver run Double Ratchet to derive message keys.
    4.  Sender encrypts message with AES-256 GCM, generates MAC, sends `ciphertext`, `sender_ephemeral_key`, `message_metadata` via WebSocket.
    5.  Receiver decrypts and verifies.
*   **Group Message (MLS):**
    1.  Sender uses the current symmetric group key (derived from their MLS key tree) to encrypt the message with AES-256 GCM, generates MAC.
    2.  Sends `ciphertext`, `sender_ephemeral_key` (if needed for rekey), `message_metadata` to the group via WebSocket.
    3.  Receivers decrypt and verify using their current group key.
*   **Vault Item:** Encrypted with the *current group symmetric key* before upload to storage.

---

### 5. MVP Roadmap (3 Months)

Our MVP will focus on core features, establishing the secure foundation, and key value propositions.

**Phase 1: Month 1 - Foundation & Core Experience (Auth, Profiles, Basic Content, E2EE 1:1)**

*   **Week 1-2: User Authentication & Backend Foundation**
    *   **Backend (Go/Node.js):**
        *   Set up core services: User Service, Auth Service.
        *   Implement user registration, login (JWT), refresh tokens.
        *   Database schema for `users`, `sessions`.
        *   User profile management (get/update `me`).
        *   S3/GCS integration for profile pictures.
        *   Basic logging, monitoring, CI/CD setup.
    *   **Frontend (React Native):**
        *   User onboarding (signup, login).
        *   Profile creation/editing UI.
        *   Navigation skeleton.
        *   Global state management (Redux/Zustand).
    *   **Security:**
        *   Implement password hashing (bcrypt/argon2).
        *   API rate limiting.

*   **Week 3-4: Content Creation & Consumption (Basic TikTok-like)**
    *   **Backend:**
        *   Content Service: `posts` table schema, CRUD for posts.
        *   Video upload (`media_url` generation, S3/GCS direct upload/signed URLs).
        *   Basic following/followers (`user_follows`).
        *   Chronological feed for followed users (`/feed/following`).
    *   **Frontend:**
        *   Video recording/upload UI.
        *   Video player component.
        *   Basic feed display.
        *   User search, follow/unfollow functionality.
    *   **Encryption:**
        *   Client-side E2EE library integration (e.g., libsignal protocol or similar).
        *   Implement identity key generation for users/devices.
        *   API for `e2ee_key_bundles` upload/fetch.
        *   Basic **1:1 Direct Messaging (DM) with Signal Protocol E2EE (X3DH + Double Ratchet)**.

**Phase 2: Month 2 - Group Privacy & Initial AI (MLS, Grok, Feed Algo v1)**

*   **Week 5-6: Encrypted Groups (Core MLS)**
    *   **Backend:**
        *   Group Service: `groups`, `group_members` schema, CRUD for groups.
        *   WebSocket service for real-time messaging.
        *   `messages` table for encrypted group messages.
    *   **Frontend:**
        *   Group creation/management UI.
        *   Group member invite/join flow.
        *   Group chat UI, display encrypted messages.
        *   Key backup/restore flow for E2EE keys (user-controlled, passphrase-protected).
    *   **Encryption:**
        *   **Implement MLS (Message Layer Security) for group E2EE.** This includes group key establishment, rekeying on join/leave, and message encryption/decryption using group keys.
        *   Hybrid PQC for identity keys and initial X3DH. *Full PQC for MLS might be pushed to later phases if complexity is too high for MVP, focusing on standard MLS first.*

*   **Week 7-8: Grok Integration & Algorithmic Feed V1**
    *   **Backend:**
        *   AI Service: Integrate Google Gemini API.
        *   `ai_threads` table, logic for managing AI conversation context.
        *   Endpoint for Grok-like chat (`/ai/grok/chat`).
        *   Initial Algorithmic Feed Service (`/feed`) based on simple metrics (e.g., likes, views, recency, followed users).
    *   **Frontend:**
        *   Dedicated AI Chat UI for Grok interaction (with clear user consent for plaintext prompts).
        *   Integration of AI responses into chat UI.
        *   Initial algorithmic feed display.
    *   **Notifications:**
        *   Basic notification system (`notifications` table).
        *   WebSocket for real-time notification pushes.

**Phase 3: Month 3 - Advanced AI, Tipping & Refinement (Text-to-Video, Solana, Vault)**

*   **Week 9-10: Advanced AI & Solana Tipping**
    *   **Backend:**
        *   AI Video Service: Integrate chosen Text-to-Video API.
        *   Asynchronous job queue (Kafka/RabbitMQ) for T2V requests.
        *   Tipping Service: `tips` table, Solana API integration (create transaction, verify).
    *   **Frontend:**
        *   Text-to-Video prompt UI, status tracking.
        *   Display AI-generated videos in posts.
        *   Solana wallet integration (connect wallet, send tip UI).
        *   Tip display on posts and user profiles.
        *   Refine video playback, performance optimizations.
    *   **Security:**
        *   Initial security audit (penetration testing scope definition).
        *   Rate limiting for AI services.

*   **Week 11-12: Vault, UI Polish & Pre-Launch Hardening**
    *   **Backend:**
        *   `vault_items` table, CRUD for encrypted vault items.
        *   Comprehensive error handling and input validation.
        *   Performance optimizations (database indexing, caching with Redis).
    *   **Frontend:**
        *   Group Vault UI (upload, list, download encrypted items).
        *   UI/UX polish across the app.
        *   Accessibility improvements.
        *   End-to-end testing.
    *   **Final Touches:**
        *   Review and enhance Post-Quantum Hybrid crypto implementation if not fully integrated in Month 2.
        *   Prepare for App Store/Play Store submission.
        *   Documentation updates.

---

This roadmap provides a solid foundation for Void, prioritizing the core innovative features and establishing a secure, scalable, and intelligent platform. The emphasis on E2EE from the outset, coupled with a hybrid PQC strategy, positions Void as a leader in privacy-preserving social media, while AI integration drives engagement and creativity.
