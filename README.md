# Sorting Dashboard

A real-time drag-and-drop dashboard for sorting projects/companies into categories across multiple questions. Built with React, Convex, and @dnd-kit.

**Live:** https://sorting-dashboard.vercel.app

## How it works

1. **Add projects** — companies or ideas you want to evaluate (comma-separated for batch)
2. **Add questions** — each question has its own categories (e.g., "genuine curiosity, interesting, ok-ish, boring")
3. **Drag & drop** projects from the sticky pool into categories
4. **Real-time sync** — changes appear instantly across all devices

Unsorted projects are highlighted with a blue accent. Fully sorted ones fade out.

## Tech stack

- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Convex (real-time database)
- **DnD:** @dnd-kit/core (touch + mouse)
- **Hosting:** Vercel (frontend) + Convex Cloud (backend)
- **Auth:** Simple password gate (client-side)

## Development

```bash
# Terminal 1: Convex dev server
npx convex dev

# Terminal 2: Vite dev server
npm run dev
```

## Seed data

```bash
npx convex run seed:run
```

## Deploy

```bash
npx convex deploy          # push functions to prod
vercel deploy --prod        # deploy frontend
```

Make sure `VITE_CONVEX_URL` is set in Vercel project settings pointing to your production Convex deployment.
