# Railway Environment Variables Reference

Quick reference for all environment variables needed for Railway deployment.

## Backend Service Variables

Set these in your **Backend Service** → **Variables**:

```env
# Server Configuration
PORT=8080
NODE_ENV=production

# Frontend URL (update after deploying frontend)
FRONTEND_URL=https://your-frontend.railway.app

# Supabase Configuration
SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Route Optimization APIs
OPENROUTESERVICE_API_KEY=your_openrouteservice_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

## Frontend Service Variables

Set these in your **Frontend Service** → **Variables**:

```env
# Supabase Configuration (Public - exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend API URL (Public - exposed to browser)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Node Environment
NODE_ENV=production
```

## Important Notes

1. **`NEXT_PUBLIC_*` variables** are exposed to the browser - never put secrets here
2. **Backend `FRONTEND_URL`** must match your frontend Railway URL exactly (no trailing slash)
3. **Frontend `NEXT_PUBLIC_API_URL`** must match your backend Railway URL exactly (no trailing slash)
4. Railway automatically provides `$PORT` - you don't need to set it, but the default fallback (8080) is fine
5. After deploying, update `FRONTEND_URL` in backend with the actual frontend URL

## Getting Your Railway URLs

1. Deploy both services
2. Go to each service → **Settings** → **Networking**
3. Copy the **Public Domain** (e.g., `https://your-service.railway.app`)
4. Use these URLs in the environment variables above

## Using Railway's Variable References

Instead of hardcoding URLs, you can use Railway's variable references:

1. In **Backend Service**, create a variable: `FRONTEND_SERVICE_URL`
2. In **Frontend Service**, reference it: `${{Backend.FRONTEND_SERVICE_URL}}`

However, for simplicity, just copy-paste the URLs after deployment.

