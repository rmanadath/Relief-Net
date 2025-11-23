# Quick Testing Guide

## 🚀 Quick Start Testing (5 minutes)

### Step 1: Basic Functionality Test

1. **Open the app:** `http://localhost:3000`
2. **Test Landing Page:**
   - ✅ Page loads without errors
   - ✅ "Get Started" button works
   - ✅ "Post Request" button works
   - ✅ Navigation links work

3. **Test Login:**
   - Click "Get Started" or go to `/login`
   - Try logging in with existing account OR
   - Sign up for a new account
   - ✅ Should redirect to Dashboard after login

4. **Test Post Request (Dashboard):**
   - Click "Post Request" tab
   - Fill out the form:
     - Name: "Test User"
     - Contact: "test@example.com"
     - Aid Type: "Food"
     - Priority: "High"
     - Description: "Need urgent food assistance" (at least 10 characters)
     - Location: "New York"
   - Click "Submit Request"
   - ✅ Should see success message

5. **Test View Requests:**
   - Click "View Requests" tab
   - ✅ Should see your submitted request
   - ✅ Can filter by type, priority, status

---

## 🎯 Full Feature Test (15 minutes)

### As Regular User:

1. **Create Multiple Requests:**
   - Post 2-3 different requests with different priorities
   - ✅ All should appear in "View Requests"

2. **Test Filters:**
   - Filter by Aid Type (Food, Medicine, etc.)
   - Filter by Priority (High, Medium, Low)
   - Filter by Status (Open, In-Progress, Fulfilled)
   - ✅ Filters should work correctly

### As Admin (Need to set role in Supabase):

1. **Set Admin Role:**
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Find your user ID
   - Set `role` column to `'admin'`
   - Refresh the app

2. **Test Admin Panel:**
   - ✅ "Admin Panel" tab should appear
   - ✅ Analytics dashboard shows at top
   - ✅ Can see all requests (not just your own)

3. **Test Volunteer Assignment:**
   - Find an "open" request
   - Click "Assign Volunteer"
   - Enter volunteer name: "John Doe"
   - ✅ Status changes to "in-progress"
   - ✅ Volunteer name appears on card

4. **Test Route Optimizer:**
   - Select 3-5 requests (check the boxes)
   - Click "Show Route Optimizer"
   - Click "Optimize Route"
   - ✅ Route list appears with numbered stops
   - ✅ Map shows markers (if map is working)
   - ✅ Statistics show total stops and distance

5. **Test Mark Fulfilled:**
   - Find an "in-progress" request
   - Click "Mark Fulfilled"
   - ✅ Status changes to green "fulfilled"
   - ✅ Analytics dashboard updates

6. **Test Feedback (Switch back to user view):**
   - Logout and login as regular user
   - Go to "View Requests"
   - Find a "fulfilled" request
   - Scroll to feedback form
   - Select 5 stars
   - Add comment: "Great service!"
   - Click "Submit Feedback"
   - ✅ Success message appears

---

## 🔍 What to Check

### ✅ Success Indicators:
- No errors in browser console (F12)
- Forms submit successfully
- Data appears in database (check Supabase)
- Status changes work
- Analytics update correctly
- Filters work
- Navigation works smoothly

### ❌ Common Issues:
- **"Cannot read property" errors** → Check browser console
- **Forms don't submit** → Check Supabase connection (`.env.local`)
- **Admin Panel not showing** → Check user role in Supabase
- **Route Optimizer not working** → Check if multiple requests selected
- **Map not loading** → Check if Leaflet is installed

---

## 🗄️ Database Verification

### Quick Check in Supabase:

1. **Check Requests:**
   ```sql
   SELECT * FROM requests ORDER BY created_at DESC LIMIT 5;
   ```
   ✅ Should see your test requests

2. **Check Profiles:**
   ```sql
   SELECT id, email, role FROM profiles;
   ```
   ✅ Should see your user with correct role

3. **Check Feedback:**
   ```sql
   SELECT * FROM feedback ORDER BY created_at DESC;
   ```
   ✅ Should see feedback if you submitted any

---

## 📝 Testing Checklist

- [ ] Landing page loads
- [ ] Login/Signup works
- [ ] Dashboard loads after login
- [ ] Can post a request
- [ ] Can view requests
- [ ] Filters work
- [ ] Admin panel visible (if admin)
- [ ] Can assign volunteer (if admin)
- [ ] Route optimizer works (if admin)
- [ ] Can mark request as fulfilled (if admin)
- [ ] Can submit feedback (as user)
- [ ] Analytics update correctly
- [ ] No console errors
- [ ] Responsive design works (try mobile view)

---

## 🎬 Quick Demo Flow

For a quick demo, follow this order:

1. **Landing Page** → Show features
2. **Login** → Sign up or login
3. **Post Request** → Create a test request
4. **View Requests** → Show your request
5. **Admin Panel** (if admin) → Show analytics, assign volunteer, optimize route
6. **Feedback** → Submit feedback on fulfilled request

**Total time:** ~5-10 minutes

---

## 💡 Tips

- **Use test data:** Create a few requests with different priorities and statuses
- **Check console:** Always have browser DevTools open (F12) to catch errors
- **Test on mobile:** Resize browser to test responsive design
- **Clear cache:** If something seems broken, try hard refresh (Cmd+Shift+R)

---

**That's it!** You don't need automated tests for basic functionality - manual testing is sufficient for this project.

