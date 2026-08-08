# ArrestDelta Data Room — portfolio build

An investor data room built for a fundraise that has since closed. The live site
is retired and the Supabase project behind it has been deleted, so this
repository has been repackaged to run as a **static, self-contained artefact**:
the same React application, serving every deck to everyone, with the backend it
used to depend on re-implemented in the browser.

```bash
cd app
npm install
npm run dev     # http://localhost:5173
```

No environment variables, no database, no accounts.

---

## What this was

A staged data room for investor diligence. Nineteen decks — thesis, market
sizing, competitive landscape, technical defensibility, GTM, revenue model,
kill criteria, partner-specific packs — grouped into three sections and served
through a single hub at `/decks`.

Access was granted per person, per deck:

1. An investor signed up at the site gate. Nothing on the site rendered until
   Supabase Auth returned a session.
2. Core thesis and execution material unlocked immediately. Partner-specific
   packs stayed locked behind a **Request access** button.
3. A request raised a notification in the admin console.
4. An admin approved it, or granted decks directly by email from the
   provisioning page.
5. The card unlocked on the requester's next visit. Read receipts closed the
   loop, so it was clear what had actually been opened before a follow-up call.

Enforcement lived in Postgres, not in the browser. Deck grants were rows in
`user_deck_access` read under row-level security; every privileged operation —
grant, revoke, approve, promote to super admin — was a `SECURITY DEFINER`
function that re-checked the caller's role inside the database. A tampered
client got nothing extra.

## What it is now

Everything above still works, and none of it enforces anything.

`app/src/lib/localBackend/` is a browser-resident emulation of the parts of
Supabase this app used:

| Module | Emulates |
| --- | --- |
| `db.ts` | The tables, as arrays in `localStorage`, with a change bus |
| `queryBuilder.ts` | The PostgREST subset the app calls — `select/insert/update/upsert/delete`, filters, `order`, `limit`, `single`, `maybeSingle`, exact counts |
| `rpc.ts` | The `SECURITY DEFINER` functions, same names and return values |
| `auth.ts` | Sessions and the auth-state subscription — with no authentication |
| `realtime.ts` | `postgres_changes` subscriptions, in-tab only |
| `seed.ts` | Fabricated users, leads, requests and notifications |

`app/src/lib/supabase.ts` picks the emulation or a real client from one flag.
Every call site is untouched — the same `supabase.from('user_deck_access')`
that used to cross the network now resolves locally.

### The parts that were removed rather than emulated

Two authorisation checks are deleted outright, each with the original behaviour
documented in the file that replaced it:

- `components/SiteProtectedRoute.tsx` — the site-wide gate. A gate that always
  says yes is worse than no gate; it implies a check that is not happening.
- `components/admin/ProtectedRoute.tsx` — the `super_admin` guard on `/admin`.

The admin console is therefore **open to anyone**, and labelled as such on every
page. That is a defensible choice here only because there is nothing behind it:
no live data, no real accounts, no server. It is an exhibit, not a pattern.

### Where the framing lives

- A persistent banner on the data room and the admin console.
- `AccessModelNote` on `/decks` — a live-product / this-build comparison.
- `EmulatedControlNotice` above each admin control, naming the SQL function it
  used to call and what pressing it does now.
- The sign-in screens at `/gate` and `/admin/login` are preserved as exhibits,
  each marked, each with an explicit skip.
- The lead-capture form warns before you type into it.

## Walk through the access control

1. Open `/decks`. Every deck is unlocked.
2. **VIEW AS → Restricted Investor.** Three partner decks lock. One already has
   a pending request; click **REQUEST ACCESS** on another.
3. `/admin/notifications` — approve the request.
4. `/admin/provision` — enter `restricted@portfolio.local` and toggle grants
   directly.
5. Back to `/decks`. The approved decks are unlocked.
6. **VIEW AS → Reset demo data** puts it back.

All state is `localStorage`, scoped to your browser. Nothing you do here is
visible to anyone else.

## Also in this build

- `/portal/*` — the product itself, running on an in-memory event simulator
  (`VITE_PORTAL_MODE=demo`). It never depended on the deleted project.
- `/brand`, `/components` — brand pack and component library.
- `supabase/migrations/` — the real schema, kept as the reference the emulation
  was written against.
- `supporting-docs/` — the source documents behind each deck, with per-deck
  changelogs and self-checks.

## Restoring a real backend

Stand up a Supabase project, apply `supabase/migrations/`, then:

```bash
VITE_APP_MODE=live
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`lib/supabase.ts` hands back the genuine client and the emulation drops out. The
two deleted guards would need restoring from git history before that is safe —
they are the only things this repackaging took away.

---

All personal and company data in the seed is invented. No investor, customer or
prospect information ships in this repository.
