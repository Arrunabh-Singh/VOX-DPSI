# Uptime Monitoring Setup

## Endpoints to Monitor

### Backend Health
- `https://vox-dpsi-production-6d95.up.railway.app/health`
- `https://vox-dpsi-production-6d95.up.railway.app/api/health`

### Frontend Availability
- `https://vox-dpsi.vercel.app`

## Expected Responses

Both health endpoints should return:
```json
{
  "status": "ok",
  "ts": 1234567890123,
  "uptime_seconds": 3600,
  "env": "production",
  "version": "2.0.0"
}
```

## UptimeRobot Setup Guide (Free Tier)

1. **Create UptimeRobot Account**
   - Sign up at https://uptimerobot.com
   - Free plan includes 50 monitors with 5-minute intervals

2. **Add Monitors**
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Vox DPSI Backend Health
   - **URL**: `https://vox-dpsi-production-6d95.up.railway.app/health`
   - **Monitoring Interval**: 5 minutes
   - **Alert Contacts**: Add email/SMS contacts for alerts

   Repeat for:
   - Vox DPSI API Health (`/api/health`)
   - Vox DPSI Frontend (`https://vox-dpsi.vercel.app`)

3. **Alert Thresholds**
   - **Down**: 1 verification (immediate alert)
   - **Alert on**: HTTP status codes != 200
   - **Alert on**: Response time > 10 seconds (optional)

4. **Notification Settings**
   - Enable email notifications
   - Optional: SMS, Slack, Discord, or webhook integrations
   - Set alert recipients to school IT/admin contacts

## Contact Information for Alerts

**Primary Contact**: School IT Coordinator
**Secondary Contact**: Vox DPSI System Administrator
**Escalation Contact**: Principal's Office

## Troubleshooting Common Issues

### Backend Health Check Fails
1. Check Railway deployment logs
2. Verify environment variables are set
3. Ensure Supabase connection is working
4. Restart the Railway service if needed

### Frontend Unavailable
1. Check Vercel deployment logs
2. Verify custom domain settings
3. Check GitHub integration for auto-deploys
4. Redeploy if necessary

## Maintenance Windows

Planned maintenance should be communicated 24 hours in advance via:
- School website notice
- Email to stakeholders
- In-app banner (if system partially available)

Last Updated: May 2026