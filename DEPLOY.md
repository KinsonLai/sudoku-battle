# Sudoku Battle — Deployment Guide

This guide walks through deploying both parts of the Sudoku Battle app to free cloud services.

- **Server** (Node.js + Express + Socket.io) → [Render](https://render.com)
- **Client** (React + Vite) → [Vercel](https://vercel.com)

---

## Prerequisites

- A [GitHub](https://github.com) account
- Your project pushed to a GitHub repository (public or private)

---

## 1. Deploy the Server to Render

1. Go to [render.com](https://render.com) and sign up with your GitHub account.
2. From the dashboard, click **New +** → **Web Service**.
3. Connect the GitHub repository containing this project.
4. Configure the service:

   | Field            | Value                       |
   |------------------|-----------------------------|
   | **Name**         | `sudoku-battle-server`      |
   | **Root Directory** | `server`                  |
   | **Runtime**      | Node                        |
   | **Build Command** | `npm install`              |
   | **Start Command** | `npm start`                |
   | **Plan**         | Free                        |

5. Add the environment variable:

   | Key               | Value                        |
   |-------------------|------------------------------|
   | `ALLOWED_ORIGINS` | *(leave empty for now)*      |

   > **Note:** `PORT` is automatically set by Render. Do not add it manually.

6. Click **Create Web Service**.
7. Wait for the deploy to finish, then copy the generated URL (e.g. `https://sudoku-battle-server.onrender.com`).

---

## 2. Deploy the Client to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **New Project** and import your GitHub repository.
3. Configure the project:

   | Field               | Value         |
   |---------------------|---------------|
   | **Root Directory**  | `client`      |
   | **Framework Preset** | Vite          |
   | **Build Command**   | `vite build`  |
   | **Output Directory** | `dist`        |

4. Add the environment variable:

   | Key             | Value                                                      |
   |-----------------|------------------------------------------------------------|
   | `VITE_API_URL`  | Your Render server URL (e.g. `https://sudoku-battle-server.onrender.com`) |

5. Click **Deploy**.
6. Once deployed, copy the generated URL (e.g. `https://sudoku-battle.vercel.app`).

---

## 3. Link Them Together

1. Go back to your Render dashboard → **sudoku-battle-server** → **Environment**.
2. Edit `ALLOWED_ORIGINS` and set it to your Vercel URL (e.g. `https://sudoku-battle.vercel.app`).
3. Render will automatically restart the service with the new setting.

---

## Environment Variables Reference

| Variable          | Service         | Required | Default                  | Description                          |
|-------------------|-----------------|----------|--------------------------|--------------------------------------|
| `VITE_API_URL`    | Client (Vercel) | Yes      | `http://localhost:3001`  | Backend server URL                   |
| `ALLOWED_ORIGINS` | Server (Render) | No       | `*` (on Render)          | Comma-separated CORS origins         |
| `PORT`            | Server (Render) | No       | `3001`                   | Server port (set automatically by Render) |

---

## Local Development

You can still run the app locally after deployment:

```bash
# Terminal 1 — Server
cd server
npm run dev

# Terminal 2 — Client
cd client
npm run dev
```

---

## Important Notes

- **Free tier sleep:** Render's free web service spins down after 15 minutes of inactivity. The first request after sleep may take 30–60 seconds to respond (cold start).
- **WebSocket support:** Both Render and Vercel support WebSocket connections, which this app requires.
- **CORS:** The server dynamically allows origins based on the `ALLOWED_ORIGINS` environment variable. On Render, it defaults to `*` (all origins allowed).
- **Room cleanup:** Inactive rooms are automatically cleaned up after 30 minutes. Finished rooms are removed after 5 minutes.

---

## Troubleshooting

| Symptom                    | Fix                                                                  |
|----------------------------|----------------------------------------------------------------------|
| **"Connection refused"**   | Ensure `VITE_API_URL` matches the Render server URL exactly (no trailing slash). |
| **CORS errors**            | Verify `ALLOWED_ORIGINS` on Render includes your Vercel domain.      |
| **WebSocket won't connect** | Render's free tier may drop idle connections — try refreshing the page. |
| **Cold start delays**      | The first visitor after inactivity will experience a delay. This is normal on Render's free plan. |
