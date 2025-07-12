import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          reputation: number;
          first_name: string | null;
          last_name: string | null;
          college: string | null;
          job_position: string | null;
          tokens: number;
          avatar_url: string | null;
          location: string | null;
          website: string | null;
          github_url: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          skills: string[] | null;
          experience_years: number;
          is_verified: boolean;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          reputation?: number;
          first_name?: string | null;
          last_name?: string | null;
          college?: string | null;
          job_position?: string | null;
          tokens?: number;
          avatar_url?: string | null;
          location?: string | null;
          website?: string | null;
          github_url?: string | null;
          linkedin_url?: string | null;
          twitter_url?: string | null;
          skills?: string[] | null;
          experience_years?: number;
          is_verified?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          reputation?: number;
          first_name?: string | null;
          last_name?: string | null;
          college?: string | null;
          job_position?: string | null;
          tokens?: number;
          avatar_url?: string | null;
          location?: string | null;
          website?: string | null;
          github_url?: string | null;
          linkedin_url?: string | null;
          twitter_url?: string | null;
          skills?: string[] | null;
          experience_years?: number;
          is_verified?: boolean;
          last_seen?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          title: string;
          content: string;
          author_id: string;
          votes: number;
          answer_count: number;
          view_count: number;
          is_answered: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          author_id: string;
          votes?: number;
          answer_count?: number;
          view_count?: number;
          is_answered?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          votes?: number;
          answer_count?: number;
          view_count?: number;
          is_answered?: boolean;
          updated_at?: string;
        };
      };
      answers: {
        Row: {
          id: string;
          content: string;
          question_id: string;
          author_id: string;
          votes: number;
          is_accepted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          question_id: string;
          author_id: string;
          votes?: number;
          is_accepted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          votes?: number;
          is_accepted?: boolean;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          question_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          question_count?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          question_count?: number;
        };
      };
      question_tags: {
        Row: {
          question_id: string;
          tag_id: string;
        };
        Insert: {
          question_id: string;
          tag_id: string;
        };
        Update: never;
      };
      votes: {
        Row: {
          id: string;
          user_id: string;
          target_id: string;
          target_type: 'question' | 'answer';
          vote_type: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_id: string;
          target_type: 'question' | 'answer';
          vote_type: number;
          created_at?: string;
        };
        Update: {
          vote_type?: number;
        };
      };
    };
  };
};