-- ==============================================================================
-- FireMessage — Migration: Fix Profile Permissions and Backfill Existing Users
-- Ensures User 1, User 2, and all registered users are searchable and visible
-- ==============================================================================

-- 1. Ensure authenticated users can insert their own profile record (client-side fallback)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. Ensure public read policy covers both anon and authenticated users
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by all" ON public.profiles;
CREATE POLICY "Public profiles are viewable by all"
ON public.profiles FOR SELECT
USING (true);

-- 3. Update trigger with collision handling and resilient error recovery
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
  collision_count INT;
BEGIN
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  clean_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  IF clean_username = '' OR char_length(clean_username) < 3 THEN
    clean_username := 'user_' || substr(new.id::text, 1, 8);
  END IF;

  -- Handle potential username collision
  SELECT count(*) INTO collision_count 
  FROM public.profiles 
  WHERE username = clean_username AND id <> new.id;

  IF collision_count > 0 THEN
    clean_username := substr(clean_username, 1, 20) || '_' || substr(new.id::text, 1, 6);
  END IF;

  user_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'FireMessage User'
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
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill any existing users in auth.users who do not yet have a public.profiles row
INSERT INTO public.profiles (id, username, full_name, status, last_seen)
SELECT 
    u.id,
    COALESCE(
        LOWER(REGEXP_REPLACE(u.raw_user_meta_data->>'username', '[^a-zA-Z0-9_]', '', 'g')),
        'user_' || SUBSTR(u.id::text, 1, 8)
    ) AS username,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        SPLIT_PART(u.email, '@', 1),
        'FireMessage User'
    ) AS full_name,
    'online',
    now()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;
