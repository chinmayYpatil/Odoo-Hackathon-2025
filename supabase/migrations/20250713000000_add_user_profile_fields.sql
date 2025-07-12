-- Add User Profile Fields Migration
-- This migration adds additional fields to the profiles table for a comprehensive user dashboard

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN college text,
ADD COLUMN job_position text,
ADD COLUMN tokens integer DEFAULT 100,
ADD COLUMN avatar_url text,
ADD COLUMN location text,
ADD COLUMN website text,
ADD COLUMN github_url text,
ADD COLUMN linkedin_url text,
ADD COLUMN twitter_url text,
ADD COLUMN skills text[],
ADD COLUMN experience_years integer DEFAULT 0,
ADD COLUMN is_verified boolean DEFAULT false,
ADD COLUMN last_seen timestamptz DEFAULT now();

-- Create index for better performance on common queries
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_reputation ON profiles(reputation DESC);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Add a function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_seen
CREATE TRIGGER trigger_update_last_seen
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_last_seen();

-- Add a function to calculate full name
CREATE OR REPLACE FUNCTION get_full_name(profile profiles)
RETURNS text AS $$
BEGIN
  IF profile.first_name IS NOT NULL AND profile.last_name IS NOT NULL THEN
    RETURN profile.first_name || ' ' || profile.last_name;
  ELSIF profile.first_name IS NOT NULL THEN
    RETURN profile.first_name;
  ELSIF profile.last_name IS NOT NULL THEN
    RETURN profile.last_name;
  ELSE
    RETURN profile.display_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the existing sample data to include new fields
UPDATE profiles 
SET 
  first_name = 'John',
  last_name = 'Doe',
  college = 'MIT',
  job_position = 'Software Engineer',
  tokens = 150,
  location = 'San Francisco, CA',
  skills = ARRAY['JavaScript', 'React', 'Node.js', 'Python'],
  experience_years = 3,
  is_verified = true
WHERE username = 'johndoe';

UPDATE profiles 
SET 
  first_name = 'Jane',
  last_name = 'Smith',
  college = 'Stanford University',
  job_position = 'Full Stack Developer',
  tokens = 200,
  location = 'New York, NY',
  skills = ARRAY['TypeScript', 'React', 'Next.js', 'PostgreSQL'],
  experience_years = 5,
  is_verified = true
WHERE username = 'janesmith';

UPDATE profiles 
SET 
  first_name = 'Mike',
  last_name = 'Johnson',
  college = 'UC Berkeley',
  job_position = 'Frontend Developer',
  tokens = 75,
  location = 'Seattle, WA',
  skills = ARRAY['Vue.js', 'CSS', 'HTML', 'JavaScript'],
  experience_years = 2,
  is_verified = false
WHERE username = 'mikejohnson'; 