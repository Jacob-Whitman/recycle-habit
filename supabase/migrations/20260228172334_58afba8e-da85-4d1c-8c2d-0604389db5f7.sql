
-- Create item_types table first (no dependencies)
CREATE TABLE public.item_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('paper', 'container', 'special', 'other')),
  icon TEXT NOT NULL DEFAULT '♻️',
  default_prep_steps TEXT[] NOT NULL DEFAULT '{}',
  default_bin_double_stream TEXT CHECK (default_bin_double_stream IN ('paper', 'containers', 'special'))
);
ALTER TABLE public.item_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read item types" ON public.item_types FOR SELECT USING (true);

-- Create friend_relationships table (before profiles policies reference it)
CREATE TABLE public.friend_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);
ALTER TABLE public.friend_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own relationships" ON public.friend_relationships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can send requests" ON public.friend_relationships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Addressee can update status" ON public.friend_relationships FOR UPDATE USING (auth.uid() = addressee_id);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  profile_photo_url TEXT,
  friend_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  bandit_hat_id TEXT NOT NULL DEFAULT 'none',
  location_label TEXT,
  stream_mode TEXT DEFAULT 'single' CHECK (stream_mode IN ('single', 'double')),
  local_setup_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view friends profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.friend_relationships
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND addressee_id = profiles.user_id)
      OR (addressee_id = auth.uid() AND requester_id = profiles.user_id))
  )
);

-- Create user_item_rules table
CREATE TABLE public.user_item_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type_id TEXT NOT NULL REFERENCES public.item_types(id),
  rule TEXT NOT NULL DEFAULT 'not_sure' CHECK (rule IN ('accepted', 'not_accepted', 'not_sure')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type_id)
);
ALTER TABLE public.user_item_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own rules" ON public.user_item_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create log_entries table
CREATE TABLE public.log_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type_id TEXT NOT NULL REFERENCES public.item_types(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  stream_mode_at_log TEXT,
  location_label_at_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own logs" ON public.log_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Friends can view logs" ON public.log_entries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.friend_relationships
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND addressee_id = log_entries.user_id)
      OR (addressee_id = auth.uid() AND requester_id = log_entries.user_id))
  )
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, profile_photo_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Recycler'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_item_rules_updated_at BEFORE UPDATE ON public.user_item_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_friend_relationships_updated_at BEFORE UPDATE ON public.friend_relationships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed item types
INSERT INTO public.item_types (id, name, category, icon, default_prep_steps, default_bin_double_stream) VALUES
  ('plastic_bottle', 'Plastic Bottle', 'container', '🧴', ARRAY['Empty and rinse', 'Replace cap', 'No need to remove labels'], 'containers'),
  ('aluminum_can', 'Aluminum Can', 'container', '🥫', ARRAY['Empty and rinse', 'Can be crushed to save space'], 'containers'),
  ('glass_bottle', 'Glass Bottle/Jar', 'container', '🍾', ARRAY['Empty and rinse', 'Remove metal lids (recycle separately)', 'No need to remove labels'], 'containers'),
  ('steel_can', 'Steel/Tin Can', 'container', '🥫', ARRAY['Empty and rinse', 'Remove paper labels if possible', 'Leave lid attached if partially cut'], 'containers'),
  ('cardboard', 'Cardboard', 'paper', '📦', ARRAY['Break down and flatten', 'Remove tape and staples', 'Keep dry - no greasy cardboard'], 'paper'),
  ('paper', 'Paper', 'paper', '📄', ARRAY['Keep clean and dry', 'No shredded paper in bin', 'Remove plastic windows from envelopes'], 'paper'),
  ('paperboard', 'Paperboard (Cereal Box)', 'paper', '🥣', ARRAY['Flatten box', 'Remove plastic liner if present', 'Keep dry'], 'paper'),
  ('carton', 'Carton (Milk/Juice)', 'container', '🧃', ARRAY['Empty and rinse', 'Replace cap', 'Flatten if possible'], 'containers'),
  ('plastic_clamshell', 'Plastic Clamshell', 'container', '🫙', ARRAY['Empty and rinse', 'Check for recycling symbol #1 or #5', 'Remove labels and stickers'], 'containers'),
  ('plastic_film', 'Plastic Film/Bag', 'special', '🛍️', ARRAY['Not accepted curbside in most areas', 'Return to store drop-off bins', 'Must be clean and dry'], 'special'),
  ('batteries', 'Batteries', 'special', '🔋', ARRAY['Never put in regular recycling', 'Take to designated drop-off', 'Tape terminals of lithium batteries'], 'special'),
  ('electronics', 'Electronics', 'special', '📱', ARRAY['Never put in regular recycling', 'Take to e-waste collection', 'Remove batteries if possible'], 'special');
