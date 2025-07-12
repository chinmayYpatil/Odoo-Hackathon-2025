import React, { useState } from 'react';
import { ChatBubbleLeftIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ChatButtonProps {
  questionId: string;
  authorId: string;
  authorName: string;
  questionTitle: string;
}

export default function ChatButton({ questionId, authorId, authorName, questionTitle }: ChatButtonProps) {
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [tokensToOffer, setTokensToOffer] = useState(10);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Don't show chat button if user is not logged in or is the author
  if (!user || user.id === authorId) {
    return null;
  }

  const handleStartChat = async () => {
    if (!user || !profile) return;

    setLoading(true);
    setError('');

    try {
      // Check if user has enough tokens
      if (profile.tokens < tokensToOffer) {
        setError(`You only have ${profile.tokens} tokens available. Please reduce the amount.`);
        return;
      }

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('initiator_id', user.id)
        .eq('recipient_id', authorId)
        .eq('question_id', questionId)
        .single();

      if (existingConversation) {
        setError('You already have an active conversation for this question.');
        return;
      }

      // Create conversation using the database function
      const { data: conversationId, error: conversationError } = await supabase
        .rpc('create_chat_conversation', {
          p_initiator_id: user.id,
          p_recipient_id: authorId,
          p_question_id: questionId,
          p_tokens_to_charge: tokensToOffer
        });

      if (conversationError) {
        if (conversationError.message.includes('Insufficient tokens')) {
          setError('You don\'t have enough tokens for this chat.');
        } else {
          throw conversationError;
        }
        return;
      }

      // Send initial message if provided
      if (message.trim()) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: message.trim(),
            message_type: 'text'
          });
      }

      // Create notification for recipient
      await supabase
        .from('notifications')
        .insert({
          user_id: authorId,
          type: 'chat_request',
          title: 'New Chat Request',
          content: `${profile.display_name || profile.username} wants to chat with you about "${questionTitle}" for ${tokensToOffer} tokens.`,
          related_id: conversationId
        });

      setShowModal(false);
      setMessage('');
      setTokensToOffer(10);
      
      // Show success message
      alert(`Chat started successfully! ${tokensToOffer} tokens have been deducted from your account.`);
      
    } catch (error) {
      console.error('Error starting chat:', error);
      setError('Failed to start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
      >
        <ChatBubbleLeftIcon className="w-4 h-4" />
        Chat with {authorName}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Start Chat with {authorName}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question: {questionTitle}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tokens to Offer
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={profile?.tokens || 100}
                    value={tokensToOffer}
                    onChange={(e) => setTokensToOffer(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                  <div className="absolute right-3 top-2.5">
                    <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your balance: {profile?.tokens || 0} tokens
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi! I'd like to discuss your answer..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartChat}
                  disabled={loading || tokensToOffer <= 0 || tokensToOffer > (profile?.tokens || 0)}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting...' : `Start Chat (${tokensToOffer} tokens)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 