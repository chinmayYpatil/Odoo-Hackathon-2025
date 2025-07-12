import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import TagSelector from '../components/TagSelector';
import { supabase } from '../lib/supabase';

export default function AskQuestion() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!formData.content.trim() || formData.content === '<p><br></p>') {
      newErrors.content = 'Description is required';
    } else if (formData.content.replace(/<[^>]*>/g, '').length < 20) {
      newErrors.content = 'Description must be at least 20 characters';
    }

    if (formData.tags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Please sign in to ask a question');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create the question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          title: formData.title.trim(),
          content: formData.content,
          author_id: user.id,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Get or create tags and link them to the question
      for (const tagName of formData.tags) {
        // First, try to get existing tag or create it
        const { data: existingTag, error: tagSelectError } = await supabase
          .from('tags')
          .select('id, question_count')
          .eq('name', tagName.toLowerCase())
          .single();

        let tagId;
        if (tagSelectError && tagSelectError.code === 'PGRST116') {
          // Tag doesn't exist, create it
          const { data: newTag, error: tagCreateError } = await supabase
            .from('tags')
            .insert({ name: tagName.toLowerCase() })
            .select('id')
            .single();

          if (tagCreateError) throw tagCreateError;
          tagId = newTag.id;
        } else if (tagSelectError) {
          throw tagSelectError;
        } else {
          tagId = existingTag.id;
        }

        // Link tag to question
        const { error: linkError } = await supabase
          .from('question_tags')
          .insert({
            question_id: question.id,
            tag_id: tagId,
          });

        if (linkError) throw linkError;

        // Update tag question count
        const { error: updateError } = await supabase
          .from('tags')
          .update({ question_count: 1 })
          .eq('id', tagId);

        if (updateError) throw updateError;
      }

      navigate(`/questions/${question.id}`);
    } catch (error: any) {
      console.error('Error creating question:', error);
      alert('Failed to create question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/70">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sign In Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You need to be signed in to ask a question.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Check if user has a profile
  if (user && !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-8 text-center transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/70">
          <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-400 mb-4">Profile Required</h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-6">You need to create a profile before you can ask questions.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-yellow-600 dark:bg-yellow-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Go to Home to Create Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/70">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Ask a Question</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Be specific and clear about your question"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-300 ${
                errors.title ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Minimum 10 characters. Be specific and clear.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Provide details about your question. Include what you've tried and what specific help you need."
              className={errors.content ? 'border-red-300 dark:border-red-500' : ''}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Minimum 20 characters. Use the formatting tools to make your question clear and easy to read.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags *
            </label>
            <TagSelector
              selectedTags={formData.tags}
              onTagsChange={(tags) => setFormData({ ...formData, tags })}
              className={errors.tags ? 'border-red-300 dark:border-red-500' : ''}
            />
            {errors.tags && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tags}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add up to 5 relevant tags to help others find your question.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 hover:scale-105"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Publishing...' : 'Publish Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}