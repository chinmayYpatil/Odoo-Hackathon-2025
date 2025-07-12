import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ChatBubbleLeftIcon, 
  EyeIcon, 
  ChevronUpIcon,
  CheckCircleIcon,
  UserIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline';
import { Database } from '../lib/supabase';

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

interface QuestionCardProps {
  question: Question;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  const timeAgo = formatDistanceToNow(new Date(question.created_at), { addSuffix: true });
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}/questions/${question.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg dark:hover:shadow-gray-900/70 transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-3">
            {/* Vote Count */}
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <ChevronUpIcon className="h-4 w-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                <span className="font-medium">{question.votes}</span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">votes</span>
            </div>

            {/* Answer Count */}
            <div className="flex flex-col items-center space-y-1">
              <div className={`flex items-center space-x-1 text-sm ${
                question.is_answered ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {question.is_answered && <CheckCircleIcon className="h-4 w-4" />}
                <ChatBubbleLeftIcon className="h-4 w-4" />
                <span className="font-medium">{question.answer_count}</span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">answers</span>
            </div>

            {/* View Count */}
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <EyeIcon className="h-4 w-4" />
                <span className="font-medium">{question.view_count}</span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">views</span>
            </div>
          </div>

          {/* Question Title and Share Button */}
          <div className="flex items-center justify-between mb-2">
            <Link 
              to={`/questions/${question.id}`}
              className="block text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {question.title}
            </Link>
            <button
              onClick={handleShare}
              className="ml-2 flex items-center px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-colors"
              title="Share question"
            >
              <ClipboardIcon className="h-4 w-4 mr-1" />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>

          {/* Question Content Preview */}
          <div className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            <div dangerouslySetInnerHTML={{ 
              __html: question.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' 
            }} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {question.question_tags?.map((qt, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 transition-all duration-300 hover:scale-105"
              >
                {qt?.tags?.name ?? "Unknown Tag"}
              </span>
            ))}
          </div>

          {/* Author and Time */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <UserIcon className="w-3 h-3 text-white" />
              </div>
              <span>
                asked by{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {question.profiles.display_name || question.profiles.username}
                </span>
              </span>
            </div>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}