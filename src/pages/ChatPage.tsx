import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeftIcon, 
  PaperAirplaneIcon, 
  ChatBubbleLeftIcon,
  UserIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Database } from '../lib/supabase';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  initiator: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  recipient: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  question: {
    title: string;
  } | null;
  messages: Message[];
};

type Message = Database['public']['Tables']['messages']['Row'] & {
  sender: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
      subscribeToMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          initiator:initiator_id (username, display_name, avatar_url),
          recipient:recipient_id (username, display_name, avatar_url),
          question:question_id (title),
          messages (
            *,
            sender:sender_id (username, display_name, avatar_url)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      // Check if user is part of this conversation
      if (data.initiator_id !== user?.id && data.recipient_id !== user?.id) {
        navigate('/');
        return;
      }

      setConversation(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!conversationId) return;

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          fetchConversation(); // Refresh conversation to get new message with sender info
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = () => {
    if (!conversation || !user) return null;
    return user.id === conversation.initiator_id ? conversation.recipient : conversation.initiator;
  };

  const getUserAvatar = (avatarUrl: string | null, username: string) => {
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={username}
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
        <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Conversation not found.</p>
        </div>
      </div>
    );
  }

  const otherUser = getOtherUser();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex items-center gap-3">
              {getUserAvatar(otherUser?.avatar_url || null, otherUser?.username || '')}
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {otherUser?.display_name || otherUser?.username}
                </h1>
                {conversation.question && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Re: {conversation.question.title}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <CurrencyDollarIcon className="w-4 h-4" />
            <span>{conversation.tokens_charged} tokens</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-96 overflow-y-auto p-4 mb-4">
        {conversation.messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversation.messages.map((msg) => {
              const isOwnMessage = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && (
                    <div className="flex-shrink-0">
                      {getUserAvatar(msg.sender.avatar_url, msg.sender.username)}
                    </div>
                  )}
                  
                  <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {isOwnMessage && (
                    <div className="flex-shrink-0">
                      {getUserAvatar(msg.sender.avatar_url, msg.sender.username)}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
} 