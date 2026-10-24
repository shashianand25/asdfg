# Deploy GridSight to Vercel

The root `vercel.json` deploys the Vite frontend and FastAPI backend as two Vercel Services from this repository. `/api` requests go to FastAPI; other paths go to the frontend. Deploy from the repository root with a current Vercel CLI or import the repository into Vercel.

## Environment variables

In Vercel, open **Project Settings → Environment Variables** and add these for each environment you plan to deploy (Production, Preview, and/or Development):

```dotenv
VITE_API_URL=/api
GEMINI_API_KEY=<paste-the-value-from-backend/.env>
```

`VITE_API_URL` is a frontend build-time variable. `GEMINI_API_KEY` is read only by the backend; keep it server-side and do not rename it to a `VITE_` variable. The value is already in your local `backend/.env`; copy it into Vercel's secure environment variable form rather than committing it.

The chatbot works only when `GEMINI_API_KEY` is set. Forecast and accuracy endpoints do not require it.

## Notes

- The backend cache uses `/tmp/gridsight-cache` on Vercel. It can speed up repeat requests while a function instance is warm, but Vercel's temporary filesystem is not persistent storage.
- Vercel Services are beta and require an up-to-date Vercel CLI. If the `services` field is rejected, update the CLI and retry.
- Preview and production deployments need their own environment settings. `VITE_API_URL` is embedded when Vite builds, so redeploy after changing it.
