/*
  # Add Notifications and Mentions System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `type` (text, notification type)
      - `title` (text, notification title)
      - `content` (text, notification content)
      - `is_read` (boolean, default false)
      - `related_id` (uuid, related question/answer id)
      - `created_at` (timestamp)
    
    - `mentions`
      - `id` (uuid, primary key)
      - `mentioned_user_id` (uuid, references profiles)
      - `mentioning_user_id` (uuid, references profiles)
      - `content_id` (uuid, question or answer id)
      - `content_type` (text, 'question' or 'answer')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to read their own notifications
    - Add policies for creating mentions and notifications
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
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
CREATE TABLE IF NOT EXISTS mentions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentioned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mentioning_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('question', 'answer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(mentioned_user_id, content_id, content_type)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

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

-- Function to create notification when answer is posted
CREATE OR REPLACE FUNCTION create_answer_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for question author
  INSERT INTO notifications (user_id, type, title, content, related_id)
  SELECT 
    q.author_id,
    'answer',
    'New answer to your question',
    'Someone answered your question: ' || q.title,
    NEW.question_id
  FROM questions q
  WHERE q.id = NEW.question_id
    AND q.author_id != NEW.author_id; -- Don't notify if answering own question
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_answer_notification
  AFTER INSERT ON answers
  FOR EACH ROW EXECUTE FUNCTION create_answer_notification();

-- Function to create notification when answer is accepted
CREATE OR REPLACE FUNCTION create_accepted_answer_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if is_accepted changed from false to true
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