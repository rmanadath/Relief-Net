# 🔧 Troubleshooting Guide

## Error: "requested path is invalid"

### If you're seeing this in a browser when accessing Supabase URL:

**This is normal!** When you access `https://jnsjakpcqoilbezhexce.supabase.co/` directly in a browser, you'll see this error because it's an API endpoint, not a web page.

**To access your Supabase project:**
- Go to https://supabase.com/dashboard
- Select your project
- Use the Dashboard to manage your database, tables, etc.

### If you're seeing this error in your React app:

#### 1. **Check Environment Variables**

Make sure your `.env` file exists and has correct values:

```env
REACT_APP_SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_key_here
```

**Important:** 
- No trailing slash in the URL
- Restart your React app after changing `.env` file
- Variables must start with `REACT_APP_` to be accessible in React

#### 2. **Restart Development Server**

After updating `.env`:
```bash
# Stop the server (Ctrl+C)
# Then restart
npm start
```

#### 3. **Check Browser Console**

Open browser DevTools (F12) and check:
- Are there any errors in the Console?
- Are environment variables loading? (Check Network tab)

#### 4. **Verify Supabase Project Status**

- Go to https://supabase.com/dashboard
- Check if your project is active (not paused)
- Verify the project URL matches your `.env` file

#### 5. **Database Functions Not Found**

If you see errors about database functions (like `get_nearby_requests`), you need to run the database scripts:

1. Go to Supabase Dashboard → SQL Editor
2. Run `sprint3-database-enhancements.sql`
3. The app will automatically fallback to simpler queries if functions don't exist

### Common Issues:

#### Issue: "Cannot read property 'from' of undefined"
**Solution:** Supabase client not initialized. Check `src/supabase.js` and verify environment variables are loaded.

#### Issue: "Invalid API key"
**Solution:** 
- Verify your `REACT_APP_SUPABASE_ANON_KEY` is correct
- Get the key from: Supabase Dashboard → Settings → API → Project API keys → anon/public

#### Issue: "relation does not exist"
**Solution:** 
- Run the database setup scripts in Supabase SQL Editor
- Start with `database-setup.sql` (Sprint 1)
- Then `sprint2-database-enhancements.sql` (Sprint 2)
- Finally `sprint3-database-enhancements.sql` (Sprint 3)

#### Issue: "permission denied for table"
**Solution:**
- Check Row Level Security (RLS) policies
- Ensure you're logged in as a user
- Verify RLS policies allow your user to access the data

### Testing Your Setup:

1. **Test Supabase Connection:**
   ```javascript
   // In browser console or React component
   import { supabase } from './supabase'
   const { data, error } = await supabase.from('requests').select('count')
   console.log('Connection test:', error || 'Success!')
   ```

2. **Check Environment Variables:**
   ```javascript
   // In browser console
   console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL)
   console.log('Supabase Key:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
   ```

3. **Verify Database Tables:**
   - Go to Supabase Dashboard → Table Editor
   - Verify `requests`, `profiles`, `optimized_routes` tables exist

### Still Having Issues?

1. Check the browser console for detailed error messages
2. Check Supabase Dashboard → Logs for server-side errors
3. Verify your Supabase project is not paused
4. Make sure you're using the correct project URL and API key
