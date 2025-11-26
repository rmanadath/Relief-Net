# Railway Deployment Guide for Relief-Net

This guide will help you deploy both the Next.js frontend and Express backend to Railway.

## Overview

Your project consists of two services:
1. **Frontend**: Next.js application (root directory)
2. **Backend**: Express.js API server (`backend/` directory)

You'll need to deploy them as **two separate services** on Railway.

### About `NEXT_PUBLIC_API_URL`

The frontend code in `src/services/backendApi.js` already supports the `NEXT_PUBLIC_API_URL` environment variable. Locally, if you don't set it, it defaults to `http://localhost:8080` (which works for local development). However, **for Railway deployment, you MUST set this variable** to your backend Railway URL, otherwise the frontend will try to connect to localhost which won't work in production.

---

## Step 1: Deploy the Backend Service

### 1.1 Create a New Service for Backend

1. Go to your Railway project dashboard
2. Click **"New"** → **"GitHub Repo"** (or connect your repo)
3. Select your repository
4. Railway will auto-detect the project

### 1.2 Configure Backend Service

1. In the service settings, set the **Root Directory** to `backend`
2. Railway will automatically detect it's a Node.js project

### 1.3 Set Backend Environment Variables

Go to the **Variables** tab and add:

```env
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.railway.app

# Supabase Configuration
SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.com
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: API Keys for Route Optimization
OPENROUTESERVICE_API_KEY=your_openrouteservice_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

**Important Notes:**
- Replace `FRONTEND_URL` with your actual frontend Railway URL (you'll get this after deploying the frontend)
- Use your actual Supabase keys from your Supabase dashboard
- The `PORT` variable is optional - Railway will automatically assign a port via `$PORT` environment variable

### 1.4 Update Backend CORS Configuration

The backend already uses `process.env.FRONTEND_URL` for CORS, so once you set the environment variable, it will work correctly.

### 1.5 Deploy Backend

1. Railway will automatically deploy when you push to your connected branch
2. Or click **"Deploy"** to trigger a manual deployment
3. Once deployed, copy the **public URL** (e.g., `https://your-backend.railway.app`)

---

## Step 2: Deploy the Frontend Service

### 2.1 Create a New Service for Frontend

1. In the same Railway project, click **"New"** → **"GitHub Repo"**
2. Select the same repository
3. This will create a second service

### 2.2 Configure Frontend Service

1. In the service settings, make sure the **Root Directory** is set to `/` (root)
2. Railway should auto-detect Next.js

### 2.3 Set Frontend Environment Variables

Go to the **Variables** tab and add:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://jnsjakpcqoilbezhexce.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend API URL (REQUIRED for Railway - use the backend Railway URL from Step 1.5)
# Note: The code in src/services/backendApi.js checks for this variable
# If not set, it defaults to http://localhost:8080 which won't work in production
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Node Environment
NODE_ENV=production
```

**Important Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser, so use the anon key (not service role key)
- **`NEXT_PUBLIC_API_URL` is required for Railway deployment** - the code in `src/services/backendApi.js` (line 6) checks for this variable. Locally it defaults to `http://localhost:8080`, but for Railway you must set it to your backend Railway URL
- Set `NEXT_PUBLIC_API_URL` to your backend Railway URL (without trailing slash)
- Use the same Supabase URL and anon key as in your backend

### 2.4 Deploy Frontend

1. Railway will automatically deploy when you push to your connected branch
2. Or click **"Deploy"** to trigger a manual deployment
3. Once deployed, copy the **public URL** (e.g., `https://your-frontend.railway.app`)

---

## Step 3: Update Backend CORS with Frontend URL

After deploying the frontend:

1. Go back to your **Backend Service** → **Variables**
2. Update `FRONTEND_URL` to match your frontend Railway URL:
   ```env
   FRONTEND_URL=https://your-frontend.railway.app
   ```
3. Railway will automatically redeploy with the new environment variable

---

## Step 4: Verify Deployment

### 4.1 Test Backend Health Check

Visit: `https://your-backend.railway.app/health`

You should see:
```json
{
  "ok": true,
  "timestamp": "2024-...",
  "service": "reliefnet-backend"
}
```

### 4.2 Test Frontend

1. Visit your frontend URL: `https://your-frontend.railway.app`
2. Try logging in
3. Try posting a request
4. Check browser console for any errors

### 4.3 Check Logs

In Railway dashboard:
- Go to each service → **Deployments** → Click on a deployment → **View Logs**
- Look for any errors or warnings

---

## Troubleshooting

### Backend Not Starting

**Issue**: Backend fails to start

**Solutions**:
1. Check that all required environment variables are set
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
3. Check logs for specific error messages
4. Ensure `PORT` is not hardcoded - Railway provides `$PORT` automatically

### Frontend Can't Connect to Backend

**Issue**: Frontend shows "Backend API not available"

**Solutions**:
1. Verify `NEXT_PUBLIC_API_URL` is set correctly in frontend variables
2. Check that backend is running (visit `/health` endpoint)
3. Verify CORS is configured correctly:
   - Backend `FRONTEND_URL` should match frontend Railway URL exactly
   - No trailing slashes in URLs
4. Check browser console for CORS errors

### Build Failures

**Issue**: Build fails during deployment

**Solutions**:
1. Check build logs for specific errors
2. Ensure all dependencies are in `package.json` (not just `devDependencies`)
3. For Next.js, ensure `next` is in `dependencies`, not `devDependencies`
4. Check Node.js version compatibility (Railway uses Node 18+ by default)

### Environment Variables Not Working

**Issue**: App works locally but not on Railway

**Solutions**:
1. Remember: Next.js only exposes `NEXT_PUBLIC_*` variables to the browser
2. Regular environment variables are only available server-side
3. After changing environment variables, Railway will redeploy automatically
4. Clear browser cache if frontend variables changed

### Database Connection Issues

**Issue**: Can't connect to Supabase

**Solutions**:
1. Verify Supabase URL and keys are correct
2. Check Supabase dashboard for any service issues
3. Ensure Supabase project is not paused
4. Verify network policies in Supabase allow Railway IPs (usually not needed)

---

## Railway-Specific Tips

### Custom Domains

1. Go to service → **Settings** → **Networking**
2. Click **"Generate Domain"** for a custom Railway domain
3. Or add your own custom domain

### Environment Variables

- Railway automatically provides `$PORT` - don't hardcode port numbers
- Use Railway's **"Reference"** feature to share variables between services
- Environment variables are encrypted at rest

### Monitoring

- Use Railway's built-in metrics to monitor CPU, memory, and network
- Set up alerts for deployment failures
- Check logs regularly for errors

### Automatic Deployments

- Railway automatically deploys on push to your connected branch
- You can configure which branch to deploy from in service settings
- Use Railway's GitHub integration for automatic deployments

---

## Quick Checklist

Before deploying:
- [ ] Backend environment variables set (especially Supabase keys)
- [ ] Frontend environment variables set (especially `NEXT_PUBLIC_API_URL`)
- [ ] Both services connected to the same GitHub repository
- [ ] Backend root directory set to `backend/`
- [ ] Frontend root directory set to `/` (root)

After deploying:
- [ ] Backend health check works (`/health` endpoint)
- [ ] Frontend loads without errors
- [ ] Frontend can connect to backend API
- [ ] CORS configured correctly
- [ ] Authentication works
- [ ] Database operations work

---

## Support

If you encounter issues:
1. Check Railway logs for both services
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Test backend endpoints directly using curl or Postman
5. Compare local `.env` files with Railway environment variables

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-production.html)

