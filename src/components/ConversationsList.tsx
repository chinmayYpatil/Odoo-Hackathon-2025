import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ChatBubbleLeftIcon, 
  UserIcon,
  CurrencyDollarIcon,
  EyeIcon
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
  messages: {
    id: string;
    content: string;
    created_at: string;
  }[];
};

export default function ConversationsList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          initiator:initiator_id (username, display_name, avatar_url),
          recipient:recipient_id (username, display_name, avatar_url),
          question:question_id (title),
          messages (id, content, created_at)
        `)
        .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherUser = (conversation: Conversation) => {
    if (!user) return null;
    return user.id === conversation.initiator_id ? conversation.recipient : conversation.initiator;
  };

  const getLastMessage = (conversation: Conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return null;
    }
    return conversation.messages[conversation.messages.length - 1];
  };

  const getUserAvatar = (avatarUrl: string | null, username: string) => {
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={username}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
        <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No conversations yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Start chatting with other users by viewing questions and using the chat feature.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => {
        const otherUser = getOtherUser(conversation);
        const lastMessage = getLastMessage(conversation);
        const isInitiator = user?.id === conversation.initiator_id;

        return (
          <div
            key={conversation.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {getUserAvatar(otherUser?.avatar_url || null, otherUser?.username || '')}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {otherUser?.display_name || otherUser?.username}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isInitiator 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {isInitiator ? 'You started' : 'They started'}
                    </span>
                  </div>
                  
                  {conversation.question && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">
                      Re: {conversation.question.title}
                    </p>
                  )}
                  
                  {lastMessage ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      No messages yet
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <CurrencyDollarIcon className="w-3 h-3" />
                    <span>{conversation.tokens_charged}</span>
                  </div>
                  {lastMessage && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
                
                <Link
                  to={`/chat/${conversation.id}`}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-300"
                >
                  <EyeIcon className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 