import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ChatBubbleLeftIcon, 
  UserIcon,
  CurrencyDollarIcon,
  EyeIcon,
  BellIcon
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
    sender_id: string;
  }[];
};

export default function ChatDropdown() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      subscribeToConversations();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          initiator:initiator_id (username, display_name, avatar_url),
          recipient:recipient_id (username, display_name, avatar_url),
          question:question_id (title),
          messages (id, content, created_at, sender_id)
        `)
        .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setConversations(data || []);
      
      // Calculate unread messages
      const unread = data?.reduce((count, conv) => {
        const unreadMessages = conv.messages?.filter((msg: { sender_id: string; created_at: string }) => 
          msg.sender_id !== user.id && 
          new Date(msg.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        ).length || 0;
        return count + unreadMessages;
      }, 0) || 0;
      
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConversations = () => {
    if (!user) return;

    const subscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `initiator_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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

  const hasUnreadMessages = (conversation: Conversation) => {
    if (!user || !conversation.messages) return false;
    return conversation.messages.some(msg => 
      msg.sender_id !== user.id && 
      new Date(msg.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-300"
      >
        <ChatBubbleLeftIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-scale-in">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chats</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center">
                <ChatBubbleLeftIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conversation) => {
                  const otherUser = getOtherUser(conversation);
                  const lastMessage = getLastMessage(conversation);
                  const isInitiator = user?.id === conversation.initiator_id;
                  const unread = hasUnreadMessages(conversation);

                  return (
                    <Link
                      key={conversation.id}
                      to={`/chat/${conversation.id}`}
                      onClick={() => setIsOpen(false)}
                      className={`block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 ${
                        unread ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {getUserAvatar(otherUser?.avatar_url || null, otherUser?.username || '')}
                          {unread && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-sm font-medium truncate ${
                              unread ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {otherUser?.display_name || otherUser?.username}
                            </h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isInitiator 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {isInitiator ? 'You' : 'They'}
                            </span>
                          </div>
                          
                          {conversation.question && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                              Re: {conversation.question.title}
                            </p>
                          )}
                          
                          {lastMessage ? (
                            <p className={`text-xs truncate ${
                              unread ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                              No messages yet
                            </p>
                          )}
                        </div>

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
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {conversations.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                View All Conversations
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 