# StackIt – A Minimal Q&A Forum Platform

A minimal Q&A forum built with React, TypeScript, Vite, Supabase, and Tailwind CSS.

## Problem Statement
StackIt is a minimal Q&A forum platform, built for the Odoo Hackathon 2025.

**Team Name:** Last Dance  
**Emails:** chinmay7016@gmail.com, devansh.kyada@gmail.com

---

## Features
- User authentication (Supabase Auth)
- Ask and answer questions
- Tagging system
- Voting, notifications, and chat
- User profiles with avatars (Supabase Storage)
- Responsive, modern UI (Tailwind CSS)

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- [Supabase](https://supabase.com/) account (free tier is fine)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/Odoo-Hackathon-2025.git
cd Odoo-Hackathon-2025
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up Environment Variables
Create a `.env` file in the root directory with the following:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
You can find these in your Supabase project dashboard under Project Settings > API.

### 5. Set Up Supabase Database
1. **Create a new project** in Supabase.
2. **Run the migrations** in the `supabase/migrations/` folder using the [Supabase SQL editor](https://app.supabase.com/project/_/sql) or the [Supabase CLI](https://supabase.com/docs/guides/cli):
   - Run each `.sql` file in order to set up tables, policies, and sample data.
3. **Set up storage bucket for avatars:**
   - Run the migration `20250713000001_create_avatars_bucket.sql` to create the avatars bucket and policies.

### 6. Start the Development Server
```bash
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Scripts
- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

---

## Project Structure
- `src/` — React app source code
- `supabase/migrations/` — SQL migrations for database schema
- `src/lib/supabase.ts` — Supabase client setup

---

## Notes
- The app **will not work** without a properly configured Supabase backend.
- Make sure to run all migrations and set the required environment variables.
- For avatars, ensure the Supabase storage bucket and policies are set up (see migrations).
- For any issues, check your browser console and Supabase logs.

---

## License
MIT
