import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import QuestionCard from '../components/QuestionCard';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Question = Database['public']['Tables']['questions']['Row'] & {
  profiles: {
    username: string;
    display_name: string | null;
  };
  question_tags: {
    tags: {
      name: string;
    };
  }[];
};

export default function Home() {
  useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'votes' | 'unanswered'>('newest');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetchQuestions();
    fetchTags();
  }, [sortBy, selectedTag]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchQuestions();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('name')
        .order('question_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTags(data?.map(tag => tag.name) || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('questions')
        .select(`
          *,
          profiles:author_id (username, display_name),
          question_tags (
            tags (name)
          )
        `);

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }

      // Apply tag filter
      if (selectedTag) {
        query = query.eq('question_tags.tags.name', selectedTag);
      }

      // Apply sorting
      switch (sortBy) {
        case 'votes':
          query = query.order('votes', { ascending: false });
          break;
        case 'unanswered':
          query = query.eq('is_answered', false).order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Questions</h1>
          <p className="text-gray-600 mt-2">
            Ask questions, get answers, and share knowledge with the community
          </p>
        </div>
        <Link
          to="/ask"
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Ask Question
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search questions..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest</option>
              <option value="votes">Most Votes</option>
              <option value="unanswered">Unanswered</option>
            </select>
          </div>

          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {(searchTerm || selectedTag || sortBy !== 'newest') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                Tag: {selectedTag}
                <button
                  onClick={() => setSelectedTag('')}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                Sort: {sortBy}
                <button
                  onClick={() => setSortBy('newest')}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No questions found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search filters or be the first to ask a question!</p>
            <Link
              to="/ask"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Ask the First Question
            </Link>
          </div>
        ) : (
          questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))
        )}
      </div>
    </div>
  );
}