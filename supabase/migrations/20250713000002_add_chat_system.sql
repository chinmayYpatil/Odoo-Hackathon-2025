-- Add Chat System Migration
-- This migration adds tables for one-on-one chat functionality with token-based access

-- Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  tokens_charged integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(initiator_id, recipient_id, question_id)
);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create chat_requests table for pending chat requests
CREATE TABLE chat_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  tokens_offered integer NOT NULL,
  message text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  UNIQUE(requester_id, recipient_id, question_id)
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_requests ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations they are part of"
  ON conversations FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Users can update conversations they are part of"
  ON conversations FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.initiator_id = auth.uid() OR conversations.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.initiator_id = auth.uid() OR conversations.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Chat requests policies
CREATE POLICY "Users can view chat requests they sent or received"
  ON chat_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create chat requests"
  ON chat_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update chat requests they received"
  ON chat_requests FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Create indexes for better performance
CREATE INDEX idx_conversations_initiator ON conversations(initiator_id);
CREATE INDEX idx_conversations_recipient ON conversations(recipient_id);
CREATE INDEX idx_conversations_question ON conversations(question_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_chat_requests_requester ON chat_requests(requester_id);
CREATE INDEX idx_chat_requests_recipient ON chat_requests(recipient_id);
CREATE INDEX idx_chat_requests_status ON chat_requests(status);
CREATE INDEX idx_chat_requests_expires ON chat_requests(expires_at);

-- Create function to charge tokens for chat access
CREATE OR REPLACE FUNCTION charge_tokens_for_chat(
  user_id uuid,
  tokens_to_charge integer,
  conversation_id uuid
)
RETURNS boolean AS $$
DECLARE
  current_tokens integer;
BEGIN
  -- Get current token balance
  SELECT tokens INTO current_tokens
  FROM profiles
  WHERE id = user_id;
  
  -- Check if user has enough tokens
  IF current_tokens < tokens_to_charge THEN
    RETURN false;
  END IF;
  
  -- Deduct tokens
  UPDATE profiles
  SET tokens = tokens - tokens_to_charge
  WHERE id = user_id;
  
  -- Update conversation with tokens charged
  UPDATE conversations
  SET tokens_charged = tokens_charged + tokens_to_charge
  WHERE id = conversation_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to create conversation and charge tokens
CREATE OR REPLACE FUNCTION create_chat_conversation(
  p_initiator_id uuid,
  p_recipient_id uuid,
  p_question_id uuid,
  p_tokens_to_charge integer
)
RETURNS uuid AS $$
DECLARE
  conversation_uuid uuid;
  tokens_available integer;
BEGIN
  -- Check if user has enough tokens
  SELECT tokens INTO tokens_available
  FROM profiles
  WHERE id = p_initiator_id;
  
  IF tokens_available < p_tokens_to_charge THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;
  
  -- Create conversation
  INSERT INTO conversations (initiator_id, recipient_id, question_id, tokens_charged)
  VALUES (p_initiator_id, p_recipient_id, p_question_id, p_tokens_to_charge)
  RETURNING id INTO conversation_uuid;
  
  -- Deduct tokens
  UPDATE profiles
  SET tokens = tokens - p_tokens_to_charge
  WHERE id = p_initiator_id;
  
  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation updated_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Create function to clean up expired chat requests
CREATE OR REPLACE FUNCTION cleanup_expired_chat_requests()
RETURNS void AS $$
BEGIN
  UPDATE chat_requests
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired requests (runs every hour)
-- Note: This requires pg_cron extension which may not be available in all Supabase plans
-- SELECT cron.schedule('cleanup-expired-chat-requests', '0 * * * *', 'SELECT cleanup_expired_chat_requests();'); 