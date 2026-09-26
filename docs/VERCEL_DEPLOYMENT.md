# Vercel deployment

Job Way uses separate Vercel projects for the public Vite frontend and the FastAPI placement service.

## Placement API

Prepare a minimal deployment bundle that excludes the private solution and hidden-test bank:

```powershell
python scripts/prepare_vercel_api.py
cd .deploy/jobway-api
vercel link --project jobway-api
```

Configure these production variables in Vercel:

```text
JOBWAY_ENV=production
JOBWAY_SESSION_SECRET=<at least 32 random characters>
JOBWAY_CORS_ORIGINS=https://your-frontend.vercel.app
JOBWAY_TRUSTED_HOSTS=*.vercel.app
JOBWAY_ENABLE_UNSAFE_LOCAL_EXECUTION=0
JOBWAY_ENABLE_PIPELINE_SCHEDULER=0
```

Deploy with `vercel --prod`. The service uses a signed HttpOnly cookie for anonymous roadmap progress, so it remains durable across serverless instances without writing to Vercel's filesystem.

The public-only deployment deliberately returns HTTP 503 from code-execution endpoints. Deploy the Docker executor and private test store separately, then explicitly configure `JOBWAY_EXECUTOR_URL` and `JOBWAY_EXECUTOR_TOKEN` in a trusted backend deployment.

## Frontend

Set the placement API URL on the frontend project:

```text
VITE_PLACEMENT_API=https://your-placement-api.vercel.app
```

Deploy from `frontend/` with `vercel --prod`.

## Account service

The Hono service exports its application for Vercel but requires PostgreSQL before deployment. Configure a pooled `DATABASE_URL`, a direct `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGINS`, and the executor variables. Run `prisma migrate deploy` before serving production traffic.
