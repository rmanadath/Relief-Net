-- Enhanced Supabase Schema for Crisis Aid Optimizer
-- Run this in your Supabase SQL Editor

-- 1. EXTEND REQUESTS TABLE with new columns
-- Add priority and assigned_to columns to existing requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Update status to include more options
ALTER TABLE public.requests 
DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE public.requests 
ADD CONSTRAINT requests_status_check 
CHECK (status IN ('pending', 'in-progress', 'resolved', 'cancelled'));

-- Update default status
ALTER TABLE public.requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- 2. ENSURE PROFILES TABLE EXISTS (for user roles)
-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'volunteer')),
  full_name TEXT,
  phone TEXT,
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE FUNCTION TO AUTO-CREATE PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'user', COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE TRIGGER FOR AUTO-PROFILE CREATION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES FOR PROFILES
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 7. CREATE RLS POLICIES FOR REQUESTS
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can view requests" ON public.requests;

-- Create comprehensive policies
CREATE POLICY "Anyone can view requests" ON public.requests
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own requests" ON public.requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests" ON public.requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all requests" ON public.requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Volunteers can update assigned requests" ON public.requests
  FOR UPDATE USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'volunteer')
    )
  );

-- 8. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON public.requests (priority);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON public.requests (assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_aid_type ON public.requests (aid_type);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 9. CREATE UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. CREATE TRIGGER FOR UPDATED_AT
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. SAMPLE DATA FOR TESTING (OPTIONAL)
-- Insert sample admin user (replace with actual admin email)
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   gen_random_uuid(),
--   'admin@reliefnet.com',
--   crypt('admin123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- );

-- Update the admin profile
-- UPDATE public.profiles SET role = 'admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@reliefnet.com');
