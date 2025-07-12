import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ChatBubbleLeftIcon, 
  EyeIcon, 
  ChevronUpIcon,
  CheckCircleIcon 
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-3">
            {/* Vote Count */}
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <ChevronUpIcon className="h-4 w-4" />
                <span className="font-medium">{question.votes}</span>
              </div>
              <span className="text-xs text-gray-400">votes</span>
            </div>

            {/* Answer Count */}
            <div className="flex flex-col items-center space-y-1">
              <div className={`flex items-center space-x-1 text-sm ${
                question.is_answered ? 'text-green-600' : 'text-gray-500'
              }`}>
                {question.is_answered && <CheckCircleIcon className="h-4 w-4" />}
                <ChatBubbleLeftIcon className="h-4 w-4" />
                <span className="font-medium">{question.answer_count}</span>
              </div>
              <span className="text-xs text-gray-400">answers</span>
            </div>

            {/* View Count */}
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <EyeIcon className="h-4 w-4" />
                <span className="font-medium">{question.view_count}</span>
              </div>
              <span className="text-xs text-gray-400">views</span>
            </div>
          </div>

          {/* Question Title */}
          <Link 
            to={`/questions/${question.id}`}
            className="block text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2"
          >
            {question.title}
          </Link>

          {/* Question Content Preview */}
          <div className="text-gray-600 text-sm mb-3 line-clamp-2">
            <div dangerouslySetInnerHTML={{ 
              __html: question.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' 
            }} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {question.question_tags.map((qt, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {qt.tags.name}
              </span>
            ))}
          </div>

          {/* Author and Time */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              asked by{' '}
              <span className="font-medium text-gray-700">
                {question.profiles.display_name || question.profiles.username}
              </span>
            </span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}