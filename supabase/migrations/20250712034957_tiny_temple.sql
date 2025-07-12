/*
  # StackIt Q&A Platform Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `username` (text, unique)
      - `display_name` (text)
      - `bio` (text)
      - `reputation` (integer, default 0)
      - `created_at` (timestamp)
    
    - `questions`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `author_id` (uuid, references profiles)
      - `votes` (integer, default 0)
      - `answer_count` (integer, default 0)
      - `view_count` (integer, default 0)
      - `is_answered` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `answers`
      - `id` (uuid, primary key)
      - `content` (text)
      - `question_id` (uuid, references questions)
      - `author_id` (uuid, references profiles)
      - `votes` (integer, default 0)
      - `is_accepted` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tags`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `question_count` (integer, default 0)
      - `created_at` (timestamp)
    
    - `question_tags`
      - `question_id` (uuid, references questions)
      - `tag_id` (uuid, references tags)
    
    - `votes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `target_id` (uuid)
      - `target_type` (text, either 'question' or 'answer')
      - `vote_type` (integer, 1 for upvote, -1 for downvote)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their content
    - Add policies for public read access for guests
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  reputation integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  votes integer DEFAULT 0,
  answer_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  is_answered boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  content text NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  votes integer DEFAULT 0,
  is_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  question_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create question_tags junction table
CREATE TABLE IF NOT EXISTS question_tags (
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('question', 'answer')),
  vote_type integer NOT NULL CHECK (vote_type IN (1, -1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_id, target_type)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Questions policies
CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own questions"
  ON questions FOR UPDATE
  USING (auth.uid() = author_id);

-- Answers policies
CREATE POLICY "Answers are viewable by everyone"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert answers"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own answers"
  ON answers FOR UPDATE
  USING (auth.uid() = author_id);

-- Tags policies
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Question tags policies
CREATE POLICY "Question tags are viewable by everyone"
  ON question_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert question tags"
  ON question_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Votes policies
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- Create functions and triggers for updating counts
CREATE OR REPLACE FUNCTION update_question_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE questions 
    SET answer_count = answer_count + 1,
        is_answered = true,
        updated_at = now()
    WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE questions 
    SET answer_count = answer_count - 1,
        updated_at = now()
    WHERE id = OLD.question_id;
    
    -- Check if there are still answers
    UPDATE questions 
    SET is_answered = EXISTS(SELECT 1 FROM answers WHERE question_id = OLD.question_id)
    WHERE id = OLD.question_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_question_answer_count
  AFTER INSERT OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_question_answer_count();

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'question' THEN
      UPDATE questions SET votes = votes + NEW.vote_type WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'answer' THEN
      UPDATE answers SET votes = votes + NEW.vote_type WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.target_type = 'question' THEN
      UPDATE questions SET votes = votes - OLD.vote_type + NEW.vote_type WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'answer' THEN
      UPDATE answers SET votes = votes - OLD.vote_type + NEW.vote_type WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'question' THEN
      UPDATE questions SET votes = votes - OLD.vote_type WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'answer' THEN
      UPDATE answers SET votes = votes - OLD.vote_type WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Insert some sample tags
INSERT INTO tags (name, description) VALUES
('javascript', 'Questions about JavaScript programming language'),
('react', 'Questions about React framework'),
('typescript', 'Questions about TypeScript programming language'),
('css', 'Questions about Cascading Style Sheets'),
('html', 'Questions about HTML markup language'),
('node.js', 'Questions about Node.js runtime environment'),
('database', 'Questions about databases and SQL'),
('web-development', 'General web development questions')
ON CONFLICT (name) DO NOTHING;