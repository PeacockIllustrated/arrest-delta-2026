# ArrestDelta — app

React 19 + TypeScript + Vite. See [`../PORTFOLIO.md`](../PORTFOLIO.md) for what
this build is and why the backend is emulated.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Nothing else is required. The Supabase project this app used has been deleted;
the default build serves every read and write from `src/lib/localBackend`, an
in-browser emulation. See `.env.example` if you want to point it at a real
backend instead.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b` then a production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Layout

```
src/
  components/
    portfolio/     Banners and notices marking the emulated surfaces
    deckhub/       Data room auth context, read tracking, page wrapper
    admin/         Internal console shell (open — see PORTFOLIO.md)
    portal/        Product shell, theme, auth provider
    investor/      Deck slides, split by pack
  lib/
    localBackend/  In-browser stand-in for Supabase — start at config.ts
    decks.ts       Deck registry
    dataRoomPlan.ts  Section layout for the hub
  pages/
    DeckDashboard.tsx   The data room hub (/decks)
    investor/           Appendix decks
    admin/              Provisioning, leads, notifications, tasks
    portal/             The product
```

## Two things to know before changing anything

**`lib/supabase.ts` is the only place that decides between the emulation and a
real client.** Call sites are written against `SupabaseClient` and should stay
that way — the emulation implements the subset of that interface the app uses,
and a missing method is meant to fail loudly rather than return an empty result.

**Two route guards are deliberately disarmed** — `components/SiteProtectedRoute.tsx`
and `components/admin/ProtectedRoute.tsx`. Each file documents the check it used
to perform. Do not treat either as a template; restore them from git history
before pointing this at anything real.

## Known pre-existing issues

- `src/test/dataRoomPlan.test.ts` fails: the deck registry carries entries the
  data room plan does not place in a section (the investor one-pager, which is
  the site home). The hub counts what it renders, so the page is consistent —
  the plan and the registry are not.
- `npm run lint` reports pre-existing errors, mostly `set-state-in-effect` in
  the portal pages and unused variables.
