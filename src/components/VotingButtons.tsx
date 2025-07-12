import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ChevronUpIcon as ChevronUpSolid, ChevronDownIcon as ChevronDownSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface VotingButtonsProps {
  targetId: string;
  targetType: 'question' | 'answer';
  currentVotes: number;
  className?: string;
}

export default function VotingButtons({ 
  targetId, 
  targetType, 
  currentVotes, 
  className = '' 
}: VotingButtonsProps) {
  const { user } = useAuth();
  const [votes, setVotes] = useState(currentVotes);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setVotes(currentVotes);
  }, [currentVotes]);

  useEffect(() => {
    if (user) {
      fetchUserVote();
    }
  }, [user, targetId]);

  const fetchUserVote = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserVote(data?.vote_type || null);
    } catch (error) {
      console.error('Error fetching user vote:', error);
    }
  };

  const handleVote = async (voteType: number) => {
    if (!user) {
      alert('Please sign in to vote');
      return;
    }

    setLoading(true);
    try {
      if (userVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', targetId)
          .eq('target_type', targetType);

        if (error) throw error;

        setUserVote(null);
        setVotes(prev => prev - voteType);
      } else {
        // Add or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            user_id: user.id,
            target_id: targetId,
            target_type: targetType,
            vote_type: voteType,
          });

        if (error) throw error;

        const voteChange = userVote ? (voteType - userVote) : voteType;
        setUserVote(voteType);
        setVotes(prev => prev + voteChange);
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-1 ${className}`}>
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${
          userVote === 1
            ? 'text-green-600 hover:text-green-700'
            : 'text-gray-400 hover:text-green-600'
        } disabled:opacity-50`}
      >
        {userVote === 1 ? (
          <ChevronUpSolid className="h-6 w-6" />
        ) : (
          <ChevronUpIcon className="h-6 w-6" />
        )}
      </button>

      <span className={`text-lg font-semibold ${
        votes > 0 ? 'text-green-600 dark:text-green-400' : votes < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
      }`}>
        {votes}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${
          userVote === -1
            ? 'text-red-600 hover:text-red-700'
            : 'text-gray-400 hover:text-red-600'
        } disabled:opacity-50`}
      >
        {userVote === -1 ? (
          <ChevronDownSolid className="h-6 w-6" />
        ) : (
          <ChevronDownIcon className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}