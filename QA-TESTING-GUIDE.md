# QA Testing Guide - Sprint 3

## 🧪 End-to-End Testing Flow

### Prerequisites
1. Run database migration: `sprint3-database-updates.sql` in Supabase SQL Editor
2. Ensure `.env.local` has correct Supabase credentials
3. Start dev server: `npm run dev`

---

## 📋 Complete Test Flow

### 1. **Create Request**
**Steps:**
1. Navigate to `/login` or use "Skip Login (Test Mode)"
2. Click "Post Request" tab
3. Fill out form:
   - Name: "Test User"
   - Contact: "test@example.com"
   - Aid Type: "Food"
   - Priority: "High"
   - Description: "Urgent need for food assistance" (min 10 chars)
   - Location: "New York"
4. Click "Submit Request"
5. ✅ **Verify:** Success message appears, form resets

**Screenshot:** Capture form submission and success message

---

### 2. **Assign Volunteer** (Admin Only)
**Steps:**
1. Login as admin (or set role to 'admin' in Supabase profiles table)
2. Navigate to "Admin Panel" tab
3. Find a request with status "open"
4. Click "Assign Volunteer" button
5. Enter volunteer name: "John Doe"
6. ✅ **Verify:** 
   - Request status changes to "in-progress"
   - Volunteer name appears on request card
   - Analytics dashboard updates

**Screenshot:** Capture volunteer assignment and updated status

---

### 3. **Optimize Route**
**Steps:**
1. In Admin Panel, select 3-5 requests by checking boxes
2. Click "Show Route Optimizer"
3. Click "Optimize Route" button
4. ✅ **Verify:**
   - Route list appears with numbered stops
   - Color-coded markers (red=high priority, yellow=in-progress, green=fulfilled)
   - Route statistics show total stops and distance
   - Route order saved in database (check `route_order` column)

**Screenshot:** Capture optimized route with markers and statistics

---

### 4. **Deliver Request**
**Steps:**
1. In Admin Panel, find a request with status "in-progress"
2. Click "Mark Fulfilled" button
3. ✅ **Verify:**
   - Status badge changes to green "fulfilled"
   - Analytics dashboard updates (fulfilled count increases)
   - Request appears in user's "View Requests" with feedback form

**Screenshot:** Capture status change and analytics update

---

### 5. **Submit Feedback**
**Steps:**
1. As regular user, go to "View Requests" tab
2. Find a request with status "fulfilled"
3. Scroll to feedback form
4. Select rating (1-5 stars)
5. Optionally add comment
6. Click "Submit Feedback"
7. ✅ **Verify:**
   - Success message appears
   - Feedback saved in database (check `feedback` table)
   - Form resets or shows thank you message

**Screenshot:** Capture feedback form and submission

---

### 6. **Verify Analytics Update**
**Steps:**
1. As admin, go to "Admin Panel"
2. Check Analytics Dashboard at top
3. ✅ **Verify:**
   - Total Requests count matches database
   - Open/In Progress/Fulfilled counts are accurate
   - High Priority count is correct
   - Numbers update in real-time after status changes

**Screenshot:** Capture analytics dashboard with all metrics

---

## 🎨 UI/UX Verification Checklist

### **Styling Consistency**
- ✅ All forms use consistent padding (p-6, mb-5)
- ✅ Typography: Headings use font-bold, text-2xl
- ✅ Color theme: Indigo-600 primary, slate-700 text
- ✅ Border radius: rounded-lg (8px) or rounded-xl (12px)
- ✅ Shadows: shadow-sm for cards, shadow-md for buttons
- ✅ Hover states: All interactive elements have hover effects

### **Component Styling**
- ✅ Dashboard header: Proper spacing, responsive layout
- ✅ Navigation tabs: Active state with ring and shadow
- ✅ Request cards: Hover shadow, consistent padding
- ✅ Forms: Focus rings (ring-2 ring-indigo-500)
- ✅ Buttons: Consistent sizing (py-2.5, px-4/px-5)
- ✅ Status badges: Color-coded (green/yellow/blue/red)

### **Responsive Design**
- ✅ Mobile: Single column layouts
- ✅ Tablet: 2-column grids
- ✅ Desktop: 3-column grids
- ✅ Navigation: Flex-wrap on mobile
- ✅ Forms: Full width on mobile

---

## 🗺️ Map & Route Testing

### **Route Optimizer Features**
- ✅ Request selection with checkboxes
- ✅ Route optimization algorithm (nearest neighbor)
- ✅ Color-coded route markers
- ✅ Route statistics (stops, distance)
- ✅ Polylines cached for performance
- ✅ Route order saved to database

### **Marker Colors**
- 🔴 **Red:** High priority requests
- 🟡 **Yellow:** In-progress requests
- 🟢 **Green:** Fulfilled requests
- 🟠 **Orange:** Medium priority
- 🔵 **Blue:** Low priority / Open

---

## 📊 Database Verification

### **Check Supabase Tables:**

1. **requests table:**
   ```sql
   SELECT id, name, status, priority, assigned_volunteer, route_order 
   FROM requests 
   ORDER BY created_at DESC;
   ```
   ✅ Verify: `assigned_volunteer` and `route_order` columns exist

2. **feedback table:**
   ```sql
   SELECT * FROM feedback ORDER BY created_at DESC;
   ```
   ✅ Verify: Feedback records exist with ratings and comments

3. **Analytics:**
   ```sql
   SELECT * FROM request_analytics;
   ```
   ✅ Verify: View returns correct counts

---

## 🐛 Known Issues & Workarounds

1. **Map Visualization:** Currently shows placeholder. To integrate Google Maps:
   - Install: `npm install @react-google-maps/api`
   - Add API key to `.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`
   - Update RouteOptimizer component

2. **Geocoding:** Currently uses mock coordinates. For production:
   - Use Google Maps Geocoding API
   - Or use Supabase PostGIS for location queries

3. **Route Caching:** Polylines cached in memory. For persistence:
   - Store in database or localStorage
   - Implement cache invalidation

---

## 📸 Screenshot Checklist

Capture screenshots for demo slides:

1. ✅ Landing page with "Get Started" button
2. ✅ Login/Auth form with validation
3. ✅ Dashboard with all tabs visible
4. ✅ Post Request form (filled out)
5. ✅ Request list with filters
6. ✅ Admin Panel with analytics dashboard
7. ✅ Route Optimizer with selected requests
8. ✅ Optimized route with markers and statistics
9. ✅ Volunteer assignment dialog
10. ✅ Status change (open → in-progress → fulfilled)
11. ✅ Feedback form on fulfilled request
12. ✅ Analytics dashboard showing all metrics

---

## 🎬 Screen Recording Guide

Record the complete flow:
1. Start from landing page
2. Login/Sign up
3. Create request
4. Switch to admin view
5. Assign volunteer
6. Select multiple requests
7. Optimize route
8. Mark as fulfilled
9. Switch back to user view
10. Submit feedback
11. Show analytics update

**Duration:** 2-3 minutes
**Format:** MP4 or GIF
**Include:** Voiceover explaining each step

---

## ✅ Final Checklist

- [ ] All database migrations applied
- [ ] All components styled consistently
- [ ] Route optimizer working
- [ ] Volunteer assignment functional
- [ ] Feedback system operational
- [ ] Analytics updating correctly
- [ ] All screenshots captured
- [ ] Screen recording completed
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Performance acceptable (no lag)

---

## 🚀 Ready for Demo!

Once all items are checked, the application is ready for Sprint 3 presentation.

