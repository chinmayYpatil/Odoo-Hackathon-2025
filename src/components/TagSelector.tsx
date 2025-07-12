import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase, Database } from '../lib/supabase';

type Tag = Database['public']['Tables']['tags']['Row'];

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export default function TagSelector({ selectedTags, onTagsChange, className = '' }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.includes(tag.name)
      );
      setFilteredTags(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredTags([]);
      setShowSuggestions(false);
    }
  }, [inputValue, availableTags, selectedTags]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('question_count', { ascending: false });

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const addTag = async (tagName: string) => {
    if (selectedTags.includes(tagName) || selectedTags.length >= 5) return;

    // Check if tag exists, if not create it
    let existingTag = availableTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
    
    if (!existingTag) {
      try {
        const { data, error } = await supabase
          .from('tags')
          .insert({ name: tagName.toLowerCase() })
          .select()
          .single();

        if (error) throw error;
        existingTag = data;
        setAvailableTags(prev => [...prev, data]);
      } catch (error) {
        console.error('Error creating tag:', error);
        return;
      }
    }

    onTagsChange([...selectedTags, existingTag!.name]);
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 min-h-[42px] flex flex-wrap gap-2 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 bg-white dark:bg-gray-700 transition-colors duration-300">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 transition-all duration-300 hover:scale-105"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? "Add tags (e.g., react, javascript)" : ""}
          className="flex-1 min-w-[100px] outline-none text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          disabled={selectedTags.length >= 5}
        />
      </div>

      {showSuggestions && filteredTags.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900/70 max-h-60 overflow-y-auto">
          {filteredTags.slice(0, 10).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white transition-colors"
            >
              <div className="flex items-center justify-between">
                <span>{tag.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{tag.question_count} questions</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {selectedTags.length}/5 tags selected
      </div>
    </div>
  );
}