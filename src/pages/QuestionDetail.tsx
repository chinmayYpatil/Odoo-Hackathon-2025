import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { EyeIcon, CheckCircleIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import VotingButtons from '../components/VotingButtons';
import RichTextEditor from '../components/RichTextEditor';
import { supabase, Database } from '../lib/supabase';

type Question = Database['public']['Tables']['questions']['Row'] & {
  profiles: {
    username: string;
    display_name: string | null;
    reputation: number;
  };
  question_tags: {
    tags: {
      name: string;
    };
  }[];
};

type Answer = Database['public']['Tables']['answers']['Row'] & {
  profiles: {
    username: string;
    display_name: string | null;
    reputation: number;
  };
};

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuestion();
      fetchAnswers();
      incrementViewCount();
    }
  }, [id]);

  const fetchQuestion = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          profiles:author_id (username, display_name, reputation),
          question_tags (
            tags (name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuestion(data);
    } catch (error) {
      console.error('Error fetching question:', error);
      navigate('/');
    }
  };

  const fetchAnswers = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          profiles:author_id (username, display_name, reputation)
        `)
        .eq('question_id', id)
        .order('is_accepted', { ascending: false })
        .order('votes', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAnswers(data || []);
    } catch (error) {
      console.error('Error fetching answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    if (!id) return;

    try {
      await supabase
        .from('questions')
        .update({ view_count: supabase.sql`view_count + 1` })
        .eq('id', id);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Please sign in to answer questions');
      return;
    }

    if (!answerContent.trim() || answerContent === '<p><br></p>') {
      alert('Please provide an answer');
      return;
    }

    setSubmittingAnswer(true);
    try {
      const { error } = await supabase
        .from('answers')
        .insert({
          content: answerContent,
          question_id: id!,
          author_id: user.id,
        });

      if (error) throw error;

      setAnswerContent('');
      fetchAnswers();
      fetchQuestion(); // Refresh to update answer count
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string, isCurrentlyAccepted: boolean) => {
    if (!user || !question || question.author_id !== user.id) {
      return;
    }

    try {
      // First, unmark all other answers as accepted
      await supabase
        .from('answers')
        .update({ is_accepted: false })
        .eq('question_id', id!);

      // Then, toggle the selected answer
      if (!isCurrentlyAccepted) {
        await supabase
          .from('answers')
          .update({ is_accepted: true })
          .eq('id', answerId);
      }

      fetchAnswers();
      fetchQuestion();
    } catch (error) {
      console.error('Error accepting answer:', error);
      alert('Failed to accept answer. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Question not found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Question */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start space-x-6">
          <VotingButtons
            targetId={question.id}
            targetType="question"
            currentVotes={question.votes}
          />

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{question.title}</h1>

            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <EyeIcon className="h-4 w-4" />
                <span>{question.view_count} views</span>
              </div>
              <div className="flex items-center space-x-1">
                <ChatBubbleLeftIcon className="h-4 w-4" />
                <span>{question.answer_count} answers</span>
              </div>
              <span>
                Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
              </span>
            </div>

            <div
              className="prose max-w-none mb-4"
              dangerouslySetInnerHTML={{ __html: question.content }}
            />

            <div className="flex flex-wrap gap-2 mb-4">
              {question.question_tags.map((qt, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {qt.tags.name}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-500">
                Asked by{' '}
                <span className="font-medium text-gray-700">
                  {question.profiles.display_name || question.profiles.username}
                </span>
                <span className="text-gray-400 ml-1">
                  ({question.profiles.reputation} rep)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answers */}
      {answers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {answers.length} Answer{answers.length !== 1 ? 's' : ''}
          </h2>
          
          <div className="space-y-6">
            {answers.map((answer) => (
              <div
                key={answer.id}
                className={`bg-white rounded-lg border p-6 ${
                  answer.is_accepted ? 'border-green-300 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-6">
                  <VotingButtons
                    targetId={answer.id}
                    targetType="answer"
                    currentVotes={answer.votes}
                  />

                  <div className="flex-1">
                    {answer.is_accepted && (
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircleSolid className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Accepted Answer
                        </span>
                      </div>
                    )}

                    <div
                      className="prose max-w-none mb-4"
                      dangerouslySetInnerHTML={{ __html: answer.content }}
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {user && question.author_id === user.id && (
                          <button
                            onClick={() => handleAcceptAnswer(answer.id, answer.is_accepted)}
                            className={`flex items-center space-x-1 text-sm transition-colors ${
                              answer.is_accepted
                                ? 'text-green-600 hover:text-green-700'
                                : 'text-gray-500 hover:text-green-600'
                            }`}
                          >
                            {answer.is_accepted ? (
                              <CheckCircleSolid className="h-4 w-4" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4" />
                            )}
                            <span>
                              {answer.is_accepted ? 'Accepted' : 'Accept Answer'}
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="text-sm text-gray-500">
                        Answered by{' '}
                        <span className="font-medium text-gray-700">
                          {answer.profiles.display_name || answer.profiles.username}
                        </span>
                        <span className="text-gray-400 ml-1">
                          ({answer.profiles.reputation} rep)
                        </span>
                        <span className="ml-2">
                          {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer Form */}
      {user ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Answer</h3>
          
          <form onSubmit={handleSubmitAnswer}>
            <RichTextEditor
              value={answerContent}
              onChange={setAnswerContent}
              placeholder="Provide a detailed answer to help solve this question..."
            />
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Be thorough and provide examples if possible.
              </p>
              <button
                type="submit"
                disabled={submittingAnswer}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingAnswer ? 'Submitting...' : 'Post Answer'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Want to answer this question?
          </h3>
          <p className="text-gray-600 mb-4">
            Sign in to share your knowledge and help the community.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In to Answer
          </button>
        </div>
      )}
    </div>
  );
}