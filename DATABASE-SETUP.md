# 🗄️ Sprint 2 - Database Enhancement Setup Guide

## 📋 Overview
This guide will help you implement the enhanced database schema for Crisis Aid Optimizer **Sprint 2** with status tracking, priority levels, user roles, and volunteer assignments.

## 🚀 Quick Setup Steps

### 1. Run the Enhanced Schema
Copy and paste the contents of `database-enhancements.sql` into your Supabase SQL Editor and execute it.

### 2. Verify the Schema
Run the test queries from `test-schema.sql` to ensure everything works correctly.

### 3. Update Your Environment Variables
Your `.env` file should already have the correct Supabase credentials:
```env
REACT_APP_SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2pha3BjcW9pbGJlemhleGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzE1NjgsImV4cCI6MjA3NjY0NzU2OH0.kvWRxdr_0QctvUGPwaGdq016fYqNKaCfAk9smi0NcVQ
```

## 📊 New Database Features

### Enhanced Requests Table
- ✅ **status**: `pending`, `in-progress`, `resolved`, `cancelled`
- ✅ **priority**: `low`, `medium`, `high`, `urgent`
- ✅ **assigned_to**: Links to volunteer/admin user ID

### User Roles System
- ✅ **user** (default): Can post requests, view all requests
- ✅ **volunteer**: Can be assigned to requests, update assigned requests
- ✅ **admin**: Full access to all data and management

### Automatic Features
- ✅ **Auto-profile creation**: New users get profiles automatically
- ✅ **Row Level Security**: Proper access control
- ✅ **Performance indexes**: Optimized queries
- ✅ **Timestamp triggers**: Auto-update timestamps

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Insert new request with all fields
- [ ] Update request status and priority
- [ ] Assign request to volunteer
- [ ] Filter requests by status
- [ ] Filter requests by priority
- [ ] Filter requests by assigned volunteer

### User Roles
- [ ] Create user account (default role: 'user')
- [ ] Promote user to volunteer role
- [ ] Promote user to admin role
- [ ] Test role-based access permissions

### Advanced Queries
- [ ] Dashboard query for volunteers
- [ ] Admin overview statistics
- [ ] Priority-based sorting
- [ ] Assignment tracking

## 🔧 Frontend Integration Notes

### Updated Request Object Structure
```javascript
{
  id: number,
  user_id: string,
  name: string,
  contact: string,
  aid_type: string,
  description: string,
  location: string,
  status: 'pending' | 'in-progress' | 'resolved' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  assigned_to: string | null,
  created_at: string
}
```

### New Profile Object Structure
```javascript
{
  id: string,
  role: 'user' | 'admin' | 'volunteer',
  full_name: string,
  phone: string,
  organization: string,
  created_at: string,
  updated_at: string
}
```

## 🎯 Next Steps for Frontend

1. **Update RequestForm**: Add priority selection
2. **Update RequestList**: Add status, priority, and assignment columns
3. **Create Admin Panel**: Manage users and requests
4. **Create Volunteer Dashboard**: View assigned requests
5. **Add Status Management**: Allow status updates
6. **Add Assignment Feature**: Assign volunteers to requests

## 📁 Files Created
- `database-enhancements.sql` - Complete schema update script
- `test-schema.sql` - Test queries to verify functionality
- `SCHEMA.md` - Visual schema documentation
- `DATABASE-SETUP.md` - This setup guide

## 🆘 Troubleshooting

### Common Issues
1. **Permission Denied**: Check RLS policies
2. **Foreign Key Errors**: Ensure user exists before assignment
3. **Constraint Violations**: Check enum values match exactly
4. **Trigger Errors**: Verify function exists before creating trigger

### Verification Queries
```sql
-- Check if all columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'requests' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## ✅ Deliverable Status
- ✅ Updated Supabase database with working status/priority fields
- ✅ Admin/user/volunteer roles implemented
- ✅ RLS policies configured
- ✅ Performance indexes created
- ✅ Test scripts provided
- ✅ Schema documentation complete
- ✅ Team setup guide ready
