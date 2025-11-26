# 🧪 Comprehensive Testing Guide for Relief-Net

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Test Scenarios Overview](#test-scenarios-overview)
3. [Scenario 1: New User Journey](#scenario-1-new-user-journey)
4. [Scenario 2: Admin User Journey](#scenario-2-admin-user-journey)
5. [Scenario 3: Volunteer Journey](#scenario-3-volunteer-journey)
6. [Scenario 4: End-to-End Relief Workflow](#scenario-4-end-to-end-relief-workflow)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Prerequisites

### Before Starting
1. ✅ Application is running: `npm run dev` (should show `http://localhost:3000`)
2. ✅ Supabase is configured (check `.env.local` exists)
3. ✅ Database is set up (run `database-setup.sql` in Supabase)
4. ✅ Browser is open at `http://localhost:3000`

### Test Accounts Setup
You'll need to create these accounts during testing:
- **Regular User**: `testuser@example.com`
- **Admin User**: `admin@example.com` (then run SQL to make admin)
- **Volunteer User**: `volunteer@example.com` (then run SQL to make volunteer)

---

## Test Scenarios Overview

### 🎭 Roles to Test
1. **Regular User** - Can post requests and view their own requests
2. **Admin** - Can manage all requests, assign volunteers, view analytics
3. **Volunteer** - Can optimize routes, view nearby requests, complete deliveries

### 📍 Realistic Scenario: Hurricane Relief in Charlotte, NC
**Context**: A hurricane has hit Charlotte, NC. Multiple people need aid:
- Food supplies
- Medical assistance
- Shelter
- Clothing

You'll act as different people in this scenario.

---

## Scenario 1: New User Journey
**Role**: Regular User (Aid Seeker)  
**Persona**: Sarah, a Charlotte resident who needs food assistance

### Step 1: Visit Homepage
1. **Navigate to**: `http://localhost:3000`
2. **What to See**:
   - ✅ "Relief-Net" header with navigation
   - ✅ Hero section: "Providing the world a safety net"
   - ✅ Three feature cards (Post Requests, Connect Volunteers, Real-time Updates)
   - ✅ Stats section (100+ Requests, 50+ Volunteers, etc.)
   - ✅ Volunteer info section at bottom

3. **Click**: "Get Started" button (or "Login" in navigation)

### Step 2: Create Account
1. **What to See**: Login page with email/password fields
2. **Actions**:
   - Click "Need an account? Sign Up" (if on login)
   - Enter email: `testuser@example.com`
   - Enter password: `password123` (min 6 characters)
   - Click "Sign Up"

3. **Expected Result**:
   - ✅ Alert: "Check your email for confirmation"
   - ⚠️ **Note**: In development, you may need to confirm email in Supabase dashboard

### Step 3: Login
1. **Actions**:
   - Enter email: `testuser@example.com`
   - Enter password: `password123`
   - Click "Login"

2. **Expected Result**:
   - ✅ Redirected to Dashboard
   - ✅ See "Welcome to ReliefNet" header
   - ✅ Your email shown in top right
   - ✅ Role shows as "user"
   - ✅ Navigation tabs: "Post Request", "View Requests", "Route Optimizer"

### Step 4: Post a Request
1. **Click**: "Post Request" tab (should be active by default)
2. **Fill out the form**:
   - **Name**: Sarah Johnson
   - **Contact**: sarah.johnson@email.com
   - **Aid Type**: Food
   - **Priority**: High
   - **Description**: "Need food supplies for family of 4. Lost power and food spoiled. Need non-perishable items."
   - **Location**: "123 Main Street, Charlotte, NC 28202"

3. **Click**: "Submit Request"
4. **Expected Result**:
   - ✅ Success message: "Request submitted successfully!"
   - ✅ Form clears
   - ✅ Request appears in "View Requests" tab

### Step 5: View Your Request
1. **Click**: "View Requests" tab
2. **What to See**:
   - ✅ Your request listed
   - ✅ Status badge: "Open" (green)
   - ✅ Priority badge: "High" (red)
   - ✅ Aid type: "Food"
   - ✅ Location: "123 Main Street, Charlotte, NC 28202"
   - ✅ Created timestamp

3. **Test Filters**:
   - Filter by Priority: Select "High" → Should show your request
   - Filter by Type: Select "Food" → Should show your request
   - Filter by Status: Select "Open" → Should show your request

### Step 6: Post Another Request (Different Type)
1. **Click**: "Post Request" tab
2. **Fill out form**:
   - **Name**: Sarah Johnson
   - **Contact**: sarah.johnson@email.com
   - **Aid Type**: Medicine
   - **Priority**: Medium
   - **Description**: "Need prescription medications. Pharmacy closed due to storm."
   - **Location**: "456 Oak Avenue, Charlotte, NC 28203"

3. **Submit** and verify it appears in "View Requests"

---

## Scenario 2: Admin User Journey
**Role**: Admin  
**Persona**: Emergency Response Coordinator managing all requests

### Step 1: Create Admin Account
1. **Sign up** with: `admin@example.com` / `password123`
2. **Run SQL in Supabase**:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
   ```
3. **Log out and log back in**

### Step 2: Access Admin Panel
1. **After login, you should see**:
   - ✅ Additional tabs: "Admin Panel" and "Assignment Dashboard"
   - ✅ Role shows as "admin" in header

2. **Click**: "Admin Panel" tab

### Step 3: View All Requests (Admin View)
1. **What to See**:
   - ✅ Table/list of ALL requests (not just yours)
   - ✅ Requests from all users
   - ✅ Columns: Name, Contact, Aid Type, Priority, Status, Location, Actions

2. **Test Features**:
   - ✅ See requests from testuser@example.com
   - ✅ See your own requests
   - ✅ Filter by status, priority, type

### Step 4: Update Request Status
1. **Find a request** with status "Open"
2. **Click**: Status dropdown or "Update" button
3. **Change status to**: "In-Progress"
4. **Expected Result**:
   - ✅ Status updates immediately
   - ✅ Status badge changes color (yellow for in-progress)
   - ✅ Change is reflected in View Requests

### Step 5: Assign Volunteer
1. **Find a request** that needs assignment
2. **Click**: "Assign" or "Assign Volunteer" button
3. **Select**: A volunteer (if available) or create one
4. **Expected Result**:
   - ✅ Request shows assigned volunteer
   - ✅ Status may change to "In-Progress"

### Step 6: View Analytics Dashboard
1. **Look for**: Analytics section or tab
2. **What to See**:
   - ✅ Total requests count
   - ✅ Requests by status (Open, In-Progress, Fulfilled)
   - ✅ Requests by priority
   - ✅ Requests by type (Food, Medicine, Shelter, etc.)
   - ✅ Charts/graphs if available

### Step 7: Test Assignment Dashboard
1. **Click**: "Assignment Dashboard" tab
2. **What to See**:
   - ✅ Map view (if Leaflet is working)
   - ✅ Requests plotted on map
   - ✅ Color-coded markers by status/priority
   - ✅ Ability to assign requests to volunteers

---

## Scenario 3: Volunteer Journey
**Role**: Volunteer  
**Persona**: John, a volunteer driver helping with deliveries

### Step 1: Create Volunteer Account
1. **Sign up** with: `volunteer@example.com` / `password123`
2. **Run SQL in Supabase**:
   ```sql
   UPDATE public.profiles
   SET role = 'volunteer'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'volunteer@example.com');
   ```
3. **Log out and log back in**

### Step 2: Set Volunteer Location
1. **Click**: "Route Optimizer" tab
2. **In "Set Your Location" section**:
   - **Enter address**: "789 Volunteer Drive, Charlotte, NC 28204"
   - **Click**: "Save Location"

3. **Expected Result**:
   - ✅ Green box appears: "Coordinates Found"
   - ✅ Shows Latitude and Longitude
   - ✅ "View on Google Maps" link works

### Step 3: Find Nearby Requests
1. **Click**: "Find Nearby Requests" button
2. **What Happens**:
   - ✅ System geocodes any requests without coordinates
   - ✅ Shows progress: "Adding location data to X request(s)..."
   - ✅ Lists nearby requests with distances

3. **What to See**:
   - ✅ List of nearby requests
   - ✅ Distance from your location (e.g., "21.38 km")
   - ✅ Request details (name, type, priority, location)
   - ✅ Checkboxes to select requests

### Step 4: Select Requests for Route
1. **Check boxes** next to 2-3 nearby requests
2. **Expected Result**:
   - ✅ Selected requests are highlighted
   - ✅ "Optimize Route" button shows number of stops (e.g., "Optimize Route (3 stops)")

### Step 5: Optimize Route
1. **Select optimization method**: "Nearest Neighbor (Fast, Free, Recommended)"
2. **Click**: "Optimize Route" button
3. **Expected Result**:
   - ✅ Loading indicator
   - ✅ Success message: "Route optimized! Total distance: X.XX km"
   - ✅ "Optimized Route" section appears

4. **What to See in Optimized Route**:
   - ✅ Total Distance (in km)
   - ✅ Estimated Duration (in minutes)
   - ✅ Route Order (numbered list of stops)
   - ✅ Each stop shows distance from previous stop

### Step 6: View Route on Map (if available)
1. **Look for**: Map visualization of the route
2. **What to See**:
   - ✅ Your starting location marked
   - ✅ Request locations marked
   - ✅ Route lines connecting the stops
   - ✅ Optimized order shown

### Step 7: Save Route
1. **Look for**: "Save Route" or "Save This Route" button
2. **Click it** (if available)
3. **Expected Result**:
   - ✅ Route saved to "My Saved Routes" section
   - ✅ Can view saved routes later

---

## Scenario 4: End-to-End Relief Workflow
**Complete realistic scenario with multiple users**

### Setup Phase
1. **Create 3 accounts**:
   - User 1: `victim1@test.com` (needs food)
   - User 2: `victim2@test.com` (needs medicine)
   - User 3: `victim3@test.com` (needs shelter)
   - Admin: `coordinator@test.com` (already created)
   - Volunteer: `driver@test.com` (already created)

### Phase 1: Multiple Victims Post Requests

**As User 1 (victim1@test.com)**:
1. Login
2. Post request:
   - Type: Food
   - Priority: High
   - Location: "100 First Street, Charlotte, NC 28202"
   - Description: "Family of 5 needs food, no power for 3 days"

**As User 2 (victim2@test.com)**:
1. Login
2. Post request:
   - Type: Medicine
   - Priority: High
   - Location: "200 Second Avenue, Charlotte, NC 28203"
   - Description: "Elderly parent needs heart medication"

**As User 3 (victim3@test.com)**:
1. Login
2. Post request:
   - Type: Shelter
   - Priority: Medium
   - Location: "300 Third Road, Charlotte, NC 28204"
   - Description: "Home damaged, need temporary shelter"

### Phase 2: Admin Coordinates Response

**As Admin (coordinator@test.com)**:
1. Login to Admin Panel
2. **View all requests**:
   - ✅ See all 3 requests from different users
   - ✅ See their priorities and locations

3. **Prioritize requests**:
   - Update high-priority requests to "In-Progress"
   - Assign volunteer to requests

4. **Check analytics**:
   - ✅ See total: 3 requests
   - ✅ See breakdown: 2 High, 1 Medium priority
   - ✅ See breakdown: 1 Food, 1 Medicine, 1 Shelter

### Phase 3: Volunteer Delivers Aid

**As Volunteer (driver@test.com)**:
1. Login
2. **Set location**: "500 Volunteer Center, Charlotte, NC 28205"
3. **Find nearby requests**:
   - ✅ Should see all 3 requests
   - ✅ See distances from your location

4. **Select all 3 requests** for delivery
5. **Optimize route**:
   - ✅ Route shows optimal order
   - ✅ Total distance calculated
   - ✅ Estimated time shown

6. **Follow the route**:
   - Stop 1: Deliver food to User 1
   - Stop 2: Deliver medicine to User 2
   - Stop 3: Help User 3 find shelter

7. **Mark requests as fulfilled** (if feature exists):
   - Update status to "Fulfilled"
   - Add completion notes

### Phase 4: Verify Completion

**As Admin**:
1. Check all requests show "Fulfilled" status
2. View analytics:
   - ✅ Success rate updated
   - ✅ Completed requests count increased

**As Users**:
1. Each user logs in
2. Check "View Requests":
   - ✅ See their request status changed to "Fulfilled"
   - ✅ See completion timestamp

---

## Edge Cases & Error Handling

### Test 1: Invalid Address Geocoding
1. **Post request with invalid address**: "asdasdasdasd"
2. **Expected**: 
   - ✅ Request still created
   - ✅ Warning about geocoding failure
   - ✅ Can still view request (but won't appear in route optimizer)

### Test 2: Backend Unavailable
1. **Stop backend server** (if running)
2. **Try route optimization**:
   - ✅ Should use client-side fallback
   - ✅ Should still work (no red error)
   - ✅ May show info message about using client-side optimization

### Test 3: Empty Form Submission
1. **Try to submit empty request form**:
   - ✅ Should show validation errors
   - ✅ Should highlight required fields
   - ✅ Should not submit

### Test 4: Network Issues
1. **Disconnect internet** (or use browser dev tools to simulate)
2. **Try to post request**:
   - ✅ Should show error message
   - ✅ Should not crash application

### Test 5: Large Number of Requests
1. **Create 10+ requests** with different priorities/types
2. **Test filters**:
   - ✅ Should filter correctly
   - ✅ Should handle pagination (if implemented)
   - ✅ Should not slow down

### Test 6: Special Characters in Input
1. **Post request with special characters**: "Need <script>alert('test')</script> supplies"
2. **Expected**:
   - ✅ Should sanitize/escape properly
   - ✅ Should display correctly (not execute script)

---

## ✅ Testing Checklist

### Authentication
- [ ] Can sign up new account
- [ ] Can login with valid credentials
- [ ] Cannot login with invalid credentials
- [ ] Can logout
- [ ] Session persists on page refresh
- [ ] Role is correctly assigned (user/admin/volunteer)

### Request Management
- [ ] Can post new request
- [ ] Form validation works
- [ ] Request appears in list after creation
- [ ] Can view own requests
- [ ] Can filter requests (status, priority, type)
- [ ] Admin can view all requests
- [ ] Admin can update request status
- [ ] Admin can assign volunteers

### Route Optimization
- [ ] Can set volunteer location
- [ ] Location geocoding works
- [ ] Can find nearby requests
- [ ] Can select multiple requests
- [ ] Route optimization works
- [ ] Route shows correct order
- [ ] Distance calculation is accurate
- [ ] Works without backend (client-side fallback)

### UI/UX
- [ ] Navigation works between tabs
- [ ] Error messages are clear and helpful
- [ ] Success messages appear
- [ ] Loading states show during operations
- [ ] Responsive design works on mobile
- [ ] Color-coded badges work (status, priority)

### Admin Features
- [ ] Admin panel accessible only to admins
- [ ] Can view all requests
- [ ] Can update any request
- [ ] Analytics dashboard shows correct data
- [ ] Assignment dashboard works (if implemented)

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot read properties of null"
**Solution**: Already fixed - should not occur. If it does, check browser console.

### Issue: "Backend unavailable" error
**Solution**: This is expected - system should fallback to client-side. Check that fallback is working.

### Issue: Profile not found
**Solution**: Run SQL to create profile or let system auto-create on login.

### Issue: Route optimization not working
**Solution**: 
1. Check volunteer location is set
2. Check requests have valid coordinates
3. Try "Find Nearby Requests" first to geocode addresses

### Issue: Admin panel not showing
**Solution**: 
1. Verify role is 'admin' in database
2. Log out and log back in
3. Check browser console for errors

---

## 📊 Success Criteria

### Application is working correctly if:
✅ All users can create accounts and login  
✅ Users can post requests successfully  
✅ Requests are stored and displayed correctly  
✅ Admin can see and manage all requests  
✅ Volunteers can find and optimize routes  
✅ Route optimization calculates distances correctly  
✅ No console errors (except expected warnings)  
✅ UI is responsive and intuitive  
✅ Error handling is graceful (no crashes)  

---

## 🎯 Next Steps After Testing

1. **Document any bugs** found
2. **Note any UX improvements** needed
3. **Test on different browsers** (Chrome, Firefox, Safari)
4. **Test on mobile devices**
5. **Performance testing** with many requests
6. **Security testing** (try to access admin features as regular user)

---

**Happy Testing! 🚀**

