# Supabase Setup - Licona Realty Platform

## 1. Prerequisites

- A Supabase project (free tier works for development)
- Node.js 18 or later
- A Vercel account for deployment
- The project cloned locally with dependencies installed (`npm install`)

## 2. Database Setup

1. Open your Supabase project dashboard.
2. Go to the **SQL Editor**.
3. Open the file `supabase/setup-all-tables.sql` from this repository.
4. Paste the full contents into the SQL Editor and click **Run**.

This creates the following tables:

- contacts
- sphere_contacts
- referrals
- activity_entries
- campaigns
- campaign_steps
- campaign_enrollments
- approval_queue
- transactions
- documents
- social_posts
- social_analytics
- canva_assets
- testimonials
- seo_analytics
- mortgage_submissions
- voice_profiles
- intelligence_logs
- bookings
- audit_logs
- user_integrations
- agent_settings

## 3. Storage Buckets

The setup SQL also creates the following storage buckets:

| Bucket | Visibility |
|----------------|------------|
| documents | private |
| imports | private |
| canva-assets | private |
| social-media | private |
| brand-assets | public |

No manual bucket creation is needed if you ran the full setup script.

## 4. Environment Variables

Add these to your `.env.local` file (and to Vercel under Settings > Environment Variables):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
NEXT_PUBLIC_APP_URL=https://<your-app>.vercel.app

# Google
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-maps-api-key>
```

Note: Some parts of the codebase reference `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` instead. Set both variants to the same value if you encounter issues.

```
# DocuSign
DOCUSIGN_CLIENT_ID=<your-docusign-client-id>
DOCUSIGN_CLIENT_SECRET=<your-docusign-client-secret>
DOCUSIGN_ACCOUNT_ID=<your-docusign-account-id>

# Canva
CANVA_CLIENT_ID=<your-canva-client-id>
CANVA_CLIENT_SECRET=<your-canva-client-secret>
```

## 5. Verify Setup

After deploying (or running locally with `npm run dev`), hit the health endpoint:

```
GET /api/health
```

A successful response returns status 200 with all checks passing. If any check fails, the response body will indicate which service is unreachable.

## 6. RLS Policies

All tables use Supabase Row Level Security (RLS). The default policy on each table restricts access so that users can only read and write rows where:

```sql
auth.uid() = user_id
```

Do not disable RLS in production. If you need admin access for debugging, use the service role key server-side.

## 7. Troubleshooting

**503 errors from Supabase**
The database tables have not been created. Run `supabase/setup-all-tables.sql` in the SQL Editor.

**500 on /api/contacts or similar endpoints**
The contacts table (or another required table) is missing. Run the migration script from step 2.

**Google OAuth shows "not configured"**
Check that you are using the correct environment variable name. Some code paths expect `GOOGLE_CLIENT_ID`, others expect `GOOGLE_CALENDAR_CLIENT_ID`. Set both to be safe.

**Storage upload fails with "bucket not found"**
The storage buckets were not created. Re-run the setup SQL, or manually create the missing bucket in the Supabase dashboard under Storage.
