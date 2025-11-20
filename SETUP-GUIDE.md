# Setup Guide for New Developers

## 🚀 Quick Start (5 minutes)

### Step 1: Clone and Install
```bash
git clone https://github.com/rmanadath/Relief-Net.git
cd Relief-Net
npm install
```

### Step 2: Create Environment File
Create a file named `.env.local` in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2pha3BjcW9pbGJlemhleGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzE1NjgsImV4cCI6MjA3NjY0NzU2OH0.kvWRxdr_0QctvUGPwaGdq016fYqNKaCfAk9smi0NcVQ
```

**Important:** The `.env.local` file is NOT in the repository (it's in `.gitignore`), so you MUST create it manually!

### Step 3: Set Up Database
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/jnsjakpcqoilbezhexce)
2. Open SQL Editor
3. Run `database-setup.sql` (if not already run)
4. Run `sprint3-database-updates.sql` (for Sprint 3 features)

### Step 4: Start the App
```bash
npm run dev
```

Open browser to: `http://localhost:3000`

---

## 🔧 Troubleshooting

### Issue: "Module not found" or "Cannot find module"
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "NEXT_PUBLIC_SUPABASE_URL is not defined"
**Solution:**
- Make sure `.env.local` exists in the root directory (same level as `package.json`)
- Check the file has no typos
- Restart the dev server after creating `.env.local`

### Issue: "Port 3000 is already in use"
**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001
```

### Issue: "Database error" or "Table doesn't exist"
**Solution:**
1. Go to Supabase SQL Editor
2. Run `database-setup.sql` first
3. Then run `sprint3-database-updates.sql`
4. Refresh the app

### Issue: "Tailwind CSS not working"
**Solution:**
```bash
# Reinstall Tailwind dependencies
npm install -D tailwindcss@^4 autoprefixer@^10.4.21 postcss@^8.5.6 @tailwindcss/postcss
```

### Issue: "TypeScript errors"
**Solution:**
```bash
# The project uses TypeScript but also supports JavaScript
# If you see TS errors, they're usually warnings and won't break the app
# To fix: Make sure @types packages are installed
npm install -D @types/node @types/react @types/react-dom
```

---

## 📋 Prerequisites Checklist

Before running `npm run dev`, make sure:

- [ ] Node.js v18+ installed (`node -v`)
- [ ] npm installed (`npm -v`)
- [ ] `.env.local` file created with Supabase credentials
- [ ] Database migrations run in Supabase
- [ ] `npm install` completed successfully
- [ ] No port conflicts (3000 available)

---

## 🎯 Quick Test

After setup, test if everything works:

1. **Start server:** `npm run dev`
2. **Open browser:** `http://localhost:3000`
3. **Check console:** Open DevTools (F12) → Console tab
4. **Expected:** No red errors, page loads
5. **Test login:** Click "Get Started" → Should show login form

If you see errors, check the Troubleshooting section above.

---

## 📞 Still Having Issues?

Common mistakes:
1. ❌ Forgot to create `.env.local` file
2. ❌ `.env.local` in wrong location (should be in root, same as package.json)
3. ❌ Wrong Supabase URL/key in `.env.local`
4. ❌ Database tables not created
5. ❌ Node.js version too old (need v18+)
6. ❌ Dependencies not installed (`npm install`)

**Quick fix command:**
```bash
# Complete reset and setup
rm -rf node_modules .next package-lock.json
npm install
# Then create .env.local manually
npm run dev
```

