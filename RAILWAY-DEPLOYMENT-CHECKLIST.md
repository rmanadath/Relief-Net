# Railway Deployment Checklist

Use this checklist to ensure your Railway deployment is successful.

## Pre-Deployment

### Backend Service
- [ ] Backend service created in Railway
- [ ] Root directory set to `backend/`
- [ ] All environment variables set (see `RAILWAY-ENV-REFERENCE.md`)
- [ ] `SUPABASE_URL` is correct
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is correct
- [ ] `FRONTEND_URL` is set (can update after frontend deploys)

### Frontend Service
- [ ] Frontend service created in Railway
- [ ] Root directory set to `/` (root)
- [ ] All environment variables set (see `RAILWAY-ENV-REFERENCE.md`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is correct
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- [ ] `NEXT_PUBLIC_API_URL` is set to backend Railway URL

## Deployment

### Backend
- [ ] Backend service deployed successfully
- [ ] No build errors in logs
- [ ] Backend URL copied (e.g., `https://your-backend.railway.app`)

### Frontend
- [ ] Frontend service deployed successfully
- [ ] No build errors in logs
- [ ] Frontend URL copied (e.g., `https://your-frontend.railway.app`)

## Post-Deployment

### Update Environment Variables
- [ ] Backend `FRONTEND_URL` updated with frontend Railway URL
- [ ] Frontend `NEXT_PUBLIC_API_URL` updated with backend Railway URL
- [ ] Both services redeployed after variable updates

### Backend Verification
- [ ] Visit `https://your-backend.railway.app/health`
- [ ] Should return: `{"ok": true, "timestamp": "...", "service": "reliefnet-backend"}`
- [ ] Check backend logs for any errors

### Frontend Verification
- [ ] Visit `https://your-frontend.railway.app`
- [ ] Page loads without errors
- [ ] Check browser console for errors
- [ ] No CORS errors in console

### Functional Testing
- [ ] Can access login page
- [ ] Can log in with existing account
- [ ] Can post a new request
- [ ] Can view requests list
- [ ] Backend API calls work (check Network tab in browser DevTools)
- [ ] Route optimizer works (if applicable)
- [ ] Analytics dashboard works (if applicable)

### Database Connection
- [ ] Requests can be created
- [ ] Requests can be retrieved
- [ ] Authentication works
- [ ] User profiles load correctly

## Troubleshooting

If something doesn't work:

1. **Check Railway Logs**
   - Go to service → Deployments → Latest deployment → View Logs
   - Look for error messages

2. **Check Environment Variables**
   - Verify all variables are set correctly
   - No typos in variable names
   - URLs don't have trailing slashes

3. **Test Backend Directly**
   - Use curl or Postman to test backend endpoints
   - Example: `curl https://your-backend.railway.app/health`

4. **Check Browser Console**
   - Open DevTools → Console
   - Look for JavaScript errors
   - Look for network errors (CORS, 404, etc.)

5. **Verify CORS**
   - Backend `FRONTEND_URL` must exactly match frontend URL
   - Check Network tab for CORS errors

6. **Check Supabase**
   - Verify Supabase project is active (not paused)
   - Verify API keys are correct
   - Check Supabase logs for connection issues

## Common Issues

### Issue: Backend returns 404
**Solution**: Check that routes are properly configured and service is running

### Issue: CORS errors in browser
**Solution**: Verify `FRONTEND_URL` in backend matches frontend Railway URL exactly

### Issue: Frontend can't connect to backend
**Solution**: 
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend is running (test `/health` endpoint)
- Verify no firewall/network issues

### Issue: Environment variables not working
**Solution**:
- Remember: Next.js only exposes `NEXT_PUBLIC_*` variables to browser
- After changing variables, Railway redeploys automatically
- Clear browser cache if needed

### Issue: Build fails
**Solution**:
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

---

## Success Criteria

Your deployment is successful when:
- ✅ Backend health check returns `{"ok": true}`
- ✅ Frontend loads without errors
- ✅ Users can log in
- ✅ Users can create requests
- ✅ Backend API responds correctly
- ✅ No CORS errors
- ✅ Database operations work

---

## Next Steps After Deployment

1. Set up custom domains (optional)
2. Configure monitoring and alerts
3. Set up automatic deployments from main branch
4. Document your production URLs
5. Test all features in production environment

