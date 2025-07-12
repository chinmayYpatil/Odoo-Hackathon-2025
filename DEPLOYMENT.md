# StackIt - Vercel Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites
- Vercel account
- Supabase project with database and storage configured
- Git repository with your StackIt code

### Step 1: Prepare Your Repository
1. Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
2. Ensure all dependencies are in `package.json`
3. Verify your `vercel.json` configuration file is in the root directory

### Step 2: Set Up Environment Variables
Before deploying, you need to set up your Supabase environment variables in Vercel:

1. Go to your Vercel dashboard
2. Create a new project from your Git repository
3. In the project settings, go to "Environment Variables"
4. Add the following variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Step 3: Deploy
1. Connect your Git repository to Vercel
2. Vercel will automatically detect it's a Vite project
3. Click "Deploy"
4. Wait for the build to complete

### Step 4: Configure Custom Domain (Optional)
1. In your Vercel project settings, go to "Domains"
2. Add your custom domain
3. Update the `sitemap.xml` and `robots.txt` files with your actual domain

### Step 5: Update Supabase Settings
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Add your Vercel domain to the allowed origins
4. Update RLS policies if needed

## 📁 File Structure
```
stackit/
├── vercel.json          # Vercel configuration
├── public/
│   ├── robots.txt       # SEO robots file
│   └── sitemap.xml      # SEO sitemap
├── src/                 # React source code
├── package.json         # Dependencies
└── vite.config.ts       # Vite configuration
```

## 🔧 Configuration Details

### vercel.json Features:
- **SPA Routing**: All routes redirect to `index.html` for React Router
- **Static Assets**: Optimized caching for static files
- **Security Headers**: XSS protection, content type options, etc.
- **Environment Variables**: Supabase configuration
- **Build Configuration**: Uses Vite build output

### Environment Variables:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Post-Deployment Checklist

- [ ] Test the landing page loads correctly
- [ ] Verify user registration and login works
- [ ] Test question creation and answering
- [ ] Check chat functionality with token deduction
- [ ] Verify dark/light theme switching
- [ ] Test mobile responsiveness
- [ ] Check real-time features (chat, notifications)
- [ ] Verify file uploads (avatars) work
- [ ] Test search and filtering functionality

## 🔍 Troubleshooting

### Common Issues:

1. **Build Fails**: Check if all dependencies are in `package.json`
2. **Environment Variables**: Ensure Supabase URL and key are set correctly
3. **CORS Errors**: Add your Vercel domain to Supabase allowed origins
4. **Routing Issues**: Verify `vercel.json` has proper SPA routing configuration
5. **Real-time Features**: Check Supabase real-time subscriptions are enabled

### Performance Optimization:
- Static assets are cached for 1 year
- Images are optimized automatically
- Code splitting is handled by Vite
- Gzip compression is enabled by default

## 📊 Monitoring

After deployment, monitor:
- Build logs in Vercel dashboard
- Function execution times
- Error rates
- User analytics (if configured)

## 🔄 Continuous Deployment

Vercel automatically deploys on:
- Push to main branch
- Pull request creation
- Manual deployment from dashboard

Your StackIt Q&A platform is now ready for production! 🎉 