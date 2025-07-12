import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import QuestionCard from '../components/QuestionCard';
import TypewriterText from '../components/TypewriterText';
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
  const { user, profile, createProfile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'votes' | 'unanswered'>('newest');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [username, setUsername] = useState('');
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchQuestions();
    fetchTags();
  }, [sortBy, selectedTag, currentPage]);

  // Show profile form if user is logged in but doesn't have a profile
  useEffect(() => {
    if (user && !profile && !loading) {
      setShowProfileForm(true);
    }
  }, [user, profile, loading]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setCreatingProfile(true);
    try {
      await createProfile(username.trim());
      setShowProfileForm(false);
    } catch (error: any) {
      alert('Failed to create profile: ' + error.message);
    } finally {
      setCreatingProfile(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
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
      // Fetch all questions for now (pagination and search still apply)
      let query = supabase
        .from('questions')
        .select(`
          *,
          profiles:author_id (username, display_name),
          question_tags (
            tags (name)
          )
        `);
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }
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
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await query.range(from, to);
      if (error) throw error;
      let filteredQuestions = data || [];
      if (selectedTag) {
        filteredQuestions = filteredQuestions.filter(q =>
          q.question_tags?.some((qt: { tags?: { name?: string } }) => qt?.tags?.name === selectedTag)
        );
      }
      setQuestions(filteredQuestions);
      // Update totalPages for pagination
      setTotalPages(Math.max(1, Math.ceil((filteredQuestions.length || 0) / pageSize)));
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 text-center lg:text-left">
        <div className="animate-fade-in mb-6 lg:mb-0">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x relative">
              StackIt
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-xl"></div>
            </span>
          </h1>
          <div className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mt-3 lg:mt-4 h-6 sm:h-8 font-medium px-2 lg:px-0">
            <TypewriterText 
              texts={[
                "Where brilliant minds connect and knowledge flows freely ✨",
                "Questions find answers, answers find questions 🚀",
                "Building the future, one question at a time 💡",
                "Join curious minds and problem solvers 🌟"
              ]}
              speed={60}
              delay={3000}
            />
          </div>
        </div>
        <Link
          to="/ask"
          className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl animate-bounce-in text-sm sm:text-base"
        >
          Ask Question
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/70">
        <div className="flex flex-col space-y-4">
          {/* Search */}
          <div className="w-full">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search questions..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-300"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Sort Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 sm:flex-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
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
              className="flex-1 sm:flex-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300"
            >
              <option value="">All Tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(searchTerm || selectedTag || sortBy !== 'newest') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 transition-all duration-300 hover:scale-105">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 sm:ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 transition-all duration-300 hover:scale-105">
                Tag: {selectedTag}
                <button
                  onClick={() => setSelectedTag('')}
                  className="ml-1 sm:ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 transition-all duration-300 hover:scale-105">
                Sort: {sortBy}
                <button
                  onClick={() => setSortBy('newest')}
                  className="ml-1 sm:ml-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
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
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 dark:border-t-blue-300 animate-pulse-slow"></div>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">No questions found</p>
            <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm sm:text-base">Try adjusting your search filters or be the first to ask a question!</p>
            <Link
              to="/ask"
              className="inline-block mt-4 bg-blue-600 dark:bg-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base"
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
      {/* Pagination */}
      <div className="flex justify-center mt-8">
        <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {'<'}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`relative inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium transition-colors duration-200 ${
                page === currentPage
                  ? 'z-10 text-white bg-blue-600 dark:bg-white dark:text-gray-900' // Highlight current page
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {'>'}
          </button>
        </nav>
      </div>
      {showProfileForm && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Complete Your Profile
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You need to create a profile before you can ask questions or interact with the community.</p>
              </div>
              <form onSubmit={handleCreateProfile} className="mt-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="flex-1 px-3 py-2 border border-yellow-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    required
                    minLength={3}
                    maxLength={20}
                  />
                  <button
                    type="submit"
                    disabled={creatingProfile || !username.trim()}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingProfile ? 'Creating...' : 'Create Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}