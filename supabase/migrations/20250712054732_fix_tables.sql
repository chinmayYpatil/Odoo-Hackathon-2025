-- Fix Tables Migration
-- This migration ensures all tables are created properly with correct constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (to recreate them properly)
DROP TABLE IF EXISTS mentions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS question_tags CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  reputation integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE questions (
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
CREATE TABLE answers (
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
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  question_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create question_tags junction table
CREATE TABLE question_tags (
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

-- Create votes table
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('question', 'answer')),
  vote_type integer NOT NULL CHECK (vote_type IN (1, -1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_id, target_type)
);

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('answer', 'comment', 'mention', 'accepted_answer')),
  title text NOT NULL,
  content text,
  is_read boolean DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create mentions table
CREATE TABLE mentions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentioned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mentioning_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('question', 'answer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(mentioned_user_id, content_id, content_type)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

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

-- Notifications policies
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Mentions policies
CREATE POLICY "Users can read mentions"
  ON mentions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert mentions"
  ON mentions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentioning_user_id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_question_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE questions 
    SET answer_count = answer_count + 1 
    WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE questions 
    SET answer_count = answer_count - 1 
    WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_question_answer_count
  AFTER INSERT OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_question_answer_count();

CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'question' THEN
      UPDATE questions 
      SET votes = votes + NEW.vote_type 
      WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'answer' THEN
      UPDATE answers 
      SET votes = votes + NEW.vote_type 
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.target_type = 'question' THEN
      UPDATE questions 
      SET votes = votes - OLD.vote_type + NEW.vote_type 
      WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'answer' THEN
      UPDATE answers 
      SET votes = votes - OLD.vote_type + NEW.vote_type 
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'question' THEN
      UPDATE questions 
      SET votes = votes - OLD.vote_type 
      WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'answer' THEN
      UPDATE answers 
      SET votes = votes - OLD.vote_type 
      WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Notification functions
CREATE OR REPLACE FUNCTION create_answer_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, content, related_id)
  SELECT 
    q.author_id,
    'answer',
    'New answer to your question',
    'Someone answered your question: ' || q.title,
    NEW.question_id
  FROM questions q
  WHERE q.id = NEW.question_id
    AND q.author_id != NEW.author_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_answer_notification
  AFTER INSERT ON answers
  FOR EACH ROW EXECUTE FUNCTION create_answer_notification();

CREATE OR REPLACE FUNCTION create_accepted_answer_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_accepted = false AND NEW.is_accepted = true THEN
    INSERT INTO notifications (user_id, type, title, content, related_id)
    VALUES (
      NEW.author_id,
      'accepted_answer',
      'Your answer was accepted',
      'Your answer was marked as the accepted solution',
      NEW.question_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_accepted_answer_notification
  AFTER UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION create_accepted_answer_notification();
