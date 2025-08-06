
-- Create the system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.system_settings IS 'Stores system-wide configuration settings';

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to read system settings
CREATE POLICY "Allow anyone to read system settings" 
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow only admins to modify system settings
CREATE POLICY "Allow admins to modify system settings" 
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM is_admin(auth.uid()))
  );

-- Insert default settings
INSERT INTO public.system_settings (key, value)
VALUES ('signup_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
