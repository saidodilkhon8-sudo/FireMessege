-- ==============================================================================
-- FireMessage — Production-Ready Supabase PostgreSQL Schema & Security Rules
-- Futuristic Monochrome Messenger
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE (Linked with auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
    last_seen TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]+$')
);

-- ==============================================================================
-- 2. CONVERSATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    title TEXT, -- Nullable for direct chats, required for groups
    description TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. CONVERSATION MEMBERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_read_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    is_muted BOOLEAN DEFAULT false NOT NULL,
    UNIQUE (conversation_id, user_id)
);

-- ==============================================================================
-- 4. MESSAGES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'call')),
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- ==============================================================================
-- 5. ATTACHMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. MESSAGE REACTIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL, -- e.g. '🖤', '⚡', '👍', '🔥', '👀'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (message_id, user_id, reaction)
);

-- ==============================================================================
-- 7. USER BLOCKS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- ==============================================================================
-- 8. CALL SESSIONS TABLE (WebRTC Signaling State)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'connected', 'ended', 'declined', 'missed', 'busy')),
    call_type TEXT NOT NULL DEFAULT 'video' CHECK (call_type IN ('audio', 'video')),
    sdp_offer JSONB,
    sdp_answer JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMPTZ
);

-- ==============================================================================
-- 9. PUSH SUBSCRIPTIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR HIGH-THROUGHPUT REALTIME PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members (user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON public.conversation_members (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_attachments_msg ON public.attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_msg ON public.message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_conv ON public.call_sessions (conversation_id, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper security definer function: check if user is a member of conversation
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv_id AND user_id = _user_id
  );
$$;

-- Helper security definer function: check if blocked
CREATE OR REPLACE FUNCTION public.is_blocked_between(_user_a UUID, _user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _user_a AND blocked_id = _user_b)
       OR (blocker_id = _user_b AND blocked_id = _user_a)
  );
$$;

-- PROFILES Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- CONVERSATIONS Policies
CREATE POLICY "Users can view conversations they belong to"
ON public.conversations FOR SELECT
TO authenticated
USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation admins or owners can update conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- CONVERSATION MEMBERS Policies
CREATE POLICY "Users can view members in their conversations"
ON public.conversation_members FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can join or admins can add members"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (
  -- User joining themselves or admin/owner adding
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversation_members.conversation_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can update their own member state or admins can change roles"
ON public.conversation_members FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversation_members.conversation_id 
      AND user_id = auth.uid() 
      AND role = 'owner'
  )
);

CREATE POLICY "Users can leave or admins can remove members"
ON public.conversation_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversation_members.conversation_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
  )
);

-- MESSAGES Policies
CREATE POLICY "Members can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  public.is_conversation_member(conversation_id, auth.uid()) 
  AND deleted_at IS NULL
);

CREATE POLICY "Members can send messages if not blocked"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Sender can edit their own message"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Sender or Admin can delete message"
ON public.messages FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id OR
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
  )
);

-- ATTACHMENTS Policies
CREATE POLICY "Members can view message attachments"
ON public.attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = attachments.message_id 
      AND public.is_conversation_member(m.conversation_id, auth.uid())
  )
);

CREATE POLICY "Message sender can insert attachments"
ON public.attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = attachments.message_id AND m.sender_id = auth.uid()
  )
);

-- MESSAGE REACTIONS Policies
CREATE POLICY "Members can view reactions"
ON public.message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id 
      AND public.is_conversation_member(m.conversation_id, auth.uid())
  )
);

CREATE POLICY "Users can add their own reaction"
ON public.message_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reaction"
ON public.message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- USER BLOCKS Policies
CREATE POLICY "Users can manage their own blocks"
ON public.user_blocks FOR ALL
TO authenticated
USING (auth.uid() = blocker_id)
WITH CHECK (auth.uid() = blocker_id);

-- CALL SESSIONS Policies
CREATE POLICY "Members can view call sessions in their conversations"
ON public.call_sessions FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Members can initiate call sessions"
ON public.call_sessions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = caller_id 
  AND public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Call participants can update call session state"
ON public.call_sessions FOR UPDATE
TO authenticated
USING (
  auth.uid() = caller_id OR auth.uid() = receiver_id
);

-- PUSH SUBSCRIPTIONS Policies
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC USER PROFILE TRIGGER ON AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  clean_username TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract raw username or email prefix
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- Sanitize username (alphanumeric + underscore only)
  clean_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF clean_username = '' OR char_length(clean_username) < 3 THEN
    clean_username := 'user_' || substr(new.id::text, 1, 8);
  END IF;

  user_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, status)
  VALUES (
    new.id,
    clean_username,
    user_full_name,
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'bio', 'Futuristic Messenger Member'),
    'online'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- HELPER FUNCTION: GET OR CREATE DIRECT CONVERSATION
-- Prevents duplicate 1-on-1 chats between any pair of users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  conv_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create direct conversation with self';
  END IF;

  -- Find existing direct conversation between these two users
  SELECT c.id INTO conv_id
  FROM public.conversations c
  JOIN public.conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = current_user_id
  JOIN public.conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = other_user_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create new direct conversation
  INSERT INTO public.conversations (type, created_by)
  VALUES ('direct', current_user_id)
  RETURNING id INTO conv_id;

  -- Add both members
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES 
    (conv_id, current_user_id, 'member'),
    (conv_id, other_user_id, 'member');

  RETURN conv_id;
END;
$$;

-- Enable Realtime publication for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
