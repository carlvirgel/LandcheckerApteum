# Property Search: Senior Fullstack Challenge

Search property listings, filter by price, bedrooms, property type, status and distance, and keep a
personal watchlist. Watched properties update live over ActionCable when their price or status changes.

- **Backend:** Rails 8.1 API, PostgreSQL 17, Redis, ActionCable, JWT auth, RSpec (93 examples)
- **Frontend:** React 19, TypeScript, TanStack Query, React Router, Tailwind, Jest + React Testing Library (55 tests)

---

## Quick start

You only need Docker. Ruby, Postgres and Redis all run in containers.

```bash
docker compose up
```

Then open **http://localhost:5173**.

On first boot the database is created, migrated and seeded with 5,000 Melbourne listings, a demo user and an admin user.

| Account | Email | Password |
| --- | --- | --- |
| User (has a watchlist and saved searches) | `demo@example.com` | `password123` |
| Admin (can edit listings) | `admin@example.com` | `password123` |

### See real-time updates

1. Sign in as the demo user and open **Watchlist**.
2. In another terminal, start the market simulator:

   ```bash
   docker compose exec api bin/rails demo:market   # INTERVAL=5 COUNT=10 are optional
   ```

The simulator changes prices and statuses of watched properties. Each change shows up as a toast,
a highlighted price and an updated "down $X since you saved it" line, without a page reload. You can
make the same change through the API as an admin:

```bash
TOKEN=$(curl -s localhost:3000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r .token)
curl -X PATCH localhost:3000/api/v1/properties/<id> -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"property":{"price":850000}}'
```

### Run the tests

```bash
# Backend: RSpec, RuboCop, Brakeman
docker compose exec -e RAILS_ENV=test api bin/rails db:prepare   # first time only
docker compose exec -e RAILS_ENV=test api bundle exec rspec
docker compose exec api bin/rubocop
docker compose exec api bin/brakeman -q

# Frontend: Jest, type check, lint, production build
cd frontend && npm install
npm test
npm run typecheck && npm run lint && npm run build
```

### Production-like stack

The production stack uses `backend/Dockerfile` (the Rails production image, non-root, jemalloc,
bootsnap) behind `frontend/Dockerfile`, which builds the SPA and serves it from nginx. nginx also
proxies `/api` and `/cable`, so the browser talks to a single origin.

```bash
SECRET_KEY_BASE=$(openssl rand -hex 64) docker compose -f docker-compose.prod.yml up --build
# http://localhost:8080
```

All configuration comes from environment variables: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY_BASE`
or `JWT_SECRET`, `CORS_ORIGINS`, `API_RATE_LIMIT`, `AUTH_RATE_LIMIT`, `FORCE_SSL` and `ASSUME_SSL`.

---

## Architecture

```
 Browser ──HTTP /api/v1──▶ Vite dev proxy / nginx ──▶ Rails API (Puma) ──▶ PostgreSQL
    ▲                                                     │   │
    └──────── WebSocket /cable (JWT) ◀────────────────────┘   └──▶ Redis: ActionCable pub/sub,
                                                                   search cache, rate-limit counters
```

```
backend/
  app/controllers/api/v1/   auth, properties, watchlist_items, saved_searches
  app/controllers/concerns/ authentication (JWT), error_handling (one error envelope), rate_limited
  app/services/             PropertySearch (filters + keyset pagination), JsonWebToken, MarketSimulator
  app/serializers/          plain-Ruby JSON serializers
  app/channels/             WatchlistChannel and JWT-authenticated connection
  app/jobs/                 PropertyChangeBroadcastJob (fan-out to watchers)
frontend/src/
  api/          typed fetch client (ApiError) and endpoint functions
  auth/         AuthContext (useReducer) and token storage
  realtime/     ActionCable provider; pure cache-patching functions
  hooks/        usePropertySearch, useWatchlist, useSearchFilters, useInfiniteScroll, ...
  components/   layout/, search/ (FilterBar, ...), property/ (PropertyCard, grid), common/
  pages/        SearchPage, WatchlistPage, AuthPage (lazy loaded)
```

---

## Backend

### API

All endpoints live under `/api/v1` and return JSON. Errors always use the same envelope:
`{ "error": { "code": "validation_failed", "message": "...", "details": { "field": ["..."] } } }`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/signup` | – | `{name, email, password}` → `{token, user}` (201) |
| POST | `/auth/login` | – | `{email, password}` → `{token, user}`; rate limited per IP |
| GET | `/auth/me` | ✓ | current user |
| GET | `/properties` | – | search; see params below |
| GET | `/properties/:id` | – | includes description; ETag / 304 |
| PATCH | `/properties/:id` | admin | price/status changes are pushed to watchers |
| GET | `/watchlist` | ✓ | newest first, with embedded properties |
| POST | `/watchlist` | ✓ | `{property_id}` → 201, or 200 if already watched (idempotent) |
| DELETE | `/watchlist/:property_id` | ✓ | 204 (idempotent) |
| GET / POST / DELETE | `/saved_searches[/:id]` | ✓ | `{name, filters}`; filters are validated as a real search |

Search parameters for `GET /properties`:

- `q`: address, suburb or postcode text
- `min_price`, `max_price`
- `min_bedrooms`, `max_bedrooms`
- `property_types`: `house,apartment,townhouse,unit,villa,land`
- `status`: defaults to `active,under_offer`
- `lat`, `lng`, `radius_km`: location filter, which also enables `sort=distance`
- `sort`: `newest`, `price_asc`, `price_desc` or `distance`
- `limit`: 1–50, default 24
- `cursor`

Invalid input returns 422 with per-field details. The response looks like this:

```json
{ "data": [ { "id": 1, "price": 1250000, "bedrooms": 3, "property_type": "house", "status": "active", "agency": { … } } ],
  "meta": { "next_cursor": "eyJzIjoibmV3ZXN0Ii…", "has_more": true, "total_count": 4396, "limit": 24 } }
```

### Schema

- **`users`:** `citext` email with a unique index, bcrypt `password_digest`, and a `role` Postgres enum.
- **`agencies` 1─\* `properties`:** properties use Postgres enums for `property_type` and `listing_status`.
  Check constraints cover price, rooms and coordinates. Model validations mirror every database
  constraint, so errors come back as friendly 422s.
- **`watchlist_items`:** a join table between users and properties. A unique index on `(user_id, property_id)`
  makes adds idempotent and race-safe. `price_at_save` powers "down $50k since you saved it".
  Foreign keys cascade on delete.
- **`saved_searches`:** `filters` is `jsonb`, cleaned to known keys and validated with the same
  `PropertySearch` rules as a live search.

### Indexing and query plans

Every search returns one page of results, ordered by `(sort column, id)`.

- **Keyset pagination:** pages use `WHERE (col, id) < (last_col, last_id)` instead of `OFFSET`.
  A composite index can jump straight to that point, so page 100 costs the same as page 1. Rows
  inserted while someone scrolls can't cause duplicates or skipped rows.
- **Text search:** a stored generated column `search_text = lower(address suburb state postcode)`
  has a **trigram GIN index**, so partial terms like `richm` or `3121` are index-backed.
- **Radius search:** `earthdistance` with a **GiST index on `ll_to_earth(lat, lng)`**. `earth_box`
  pre-filters with the index, and `earth_distance` trims the result to a true circle. Distance
  sorting uses the cube `<->` operator, a KNN index scan that returns rows nearest-first.

Plans measured with `EXPLAIN ANALYZE` on 105,000 listings:

| Query | Plan | Time |
| --- | --- | --- |
| Default listing, newest first | Index Scan `(listed_at, id)` | 0.10 ms |
| Same, ~2,000 rows deep via cursor | Index Scan, `Index Cond: ROW(listed_at, id) < ROW(…)` | 0.11 ms |
| House/townhouse, $600k–$1.2M, 3+ beds, price ascending | Index Scan `(price, id)` with range condition | 0.30 ms |
| Keyword `richm` | Index Scan `(listed_at, id)` with filter (the planner prefers this for common terms when `LIMIT` is small; rare terms use the trigram index) | 1.6 ms |
| Within 2 km, nearest first | GiST KNN `Order By <->`, stops after 25 rows | 1.3 ms (100 ms before switching to KNN ordering) |

`COUNT(*)` for the result total runs only on the first page and is cached with that page.

### Avoiding N+1 queries

Search and the watchlist preload associations (`includes(:agency)`, `includes(property: :agency)`)
and mark the relation `strict_loading`, so an accidental lazy load raises instead of running a query
per row. Request specs assert that the query count stays the same as results grow: search uses 3
queries per page (properties, agencies, count), and the watchlist uses 4 (the auth lookup, items,
properties, agencies).

### Authentication

- `has_secure_password`, with `User.authenticate_by` for timing-safe login, so wrong passwords and
  unknown emails behave identically.
- HS256 JWTs: 24-hour expiry, `sub`/`iat`/`exp`/`jti` claims, required claims verified, the `none`
  algorithm rejected.
- Endpoints are public unless they opt in with `before_action :require_authentication!`. On a public
  endpoint an invalid token is treated as anonymous.
- ActionCable authenticates the WebSocket handshake with the same token, passed as `?token=` because
  browsers can't set headers on a WebSocket. `filter_parameters` keeps the token out of the logs.
- **Trade-off:** the SPA keeps the token in `localStorage`, which is simple but readable by XSS. In
  production I'd use a short-lived access token in memory plus a refresh token in an httpOnly,
  SameSite cookie, with a `jti` denylist for logout and revocation.

### Real-time updates

```
Property#update  ──after_update_commit (price/status changed)──▶  PropertyChangeBroadcastJob
   └─ for each watcher (watchlist_items.property_id index, batches of 1,000)
        ActionCable.broadcast("watchlist:user:<id>", { type: "property.updated", property, changes })
```

- There is **one stream per user**, so a client holds one subscription no matter how many
  properties it watches. The server fans out off the request thread.
- Adds and removes also broadcast `watchlist.added` / `watchlist.removed`, so a user's other tabs
  and devices stay in sync.
- Redis is the cable adapter in development too, so broadcasts from another process (the simulator,
  a console) reach browsers.
- ActiveJob uses the `:async` adapter to keep the stack small. In production that would be
  Sidekiq or Solid Queue.

### Caching

- **Redis:** search responses are cached as serialized JSON under
  `[search version, digest of normalized params]` for 10 minutes. Any committed property write
  rotates the version, so a stale page is never served after an update. Bulk writes such as seeds
  call `Property.expire_search_cache!`.
- **HTTP:** search and show responses send an `ETag` with `Cache-Control: public, no-cache`. Any
  cache may store the response, but it must revalidate every time, so a cached copy never hides a
  change that was just pushed over the socket. A matching `If-None-Match` returns **304 without
  running any SQL or building the response** (a spec asserts zero queries).
- Responses are cacheable because **property JSON is user-independent**. "Is this watched?" is not
  embedded per row: the client already holds the watchlist and computes it. That also keeps cache
  keys from multiplying per user.

### Rate limiting

Rails 8's built-in `rate_limit` keeps fixed-window counters in Redis.

- **Whole API:** 300 requests per minute per user, or per IP for anonymous requests.
- **Login and signup:** 10 requests per 3 minutes per IP.

Over the limit, requests get a `429` in the usual error envelope plus a `Retry-After` header.

### Tests (RSpec)

Request specs cover every endpoint: success paths, validation errors, 401 and 403 responses,
idempotency, N+1 query counts, ETag/304, cache invalidation and rate limiting. Model specs cover
validations, database constraints and broadcast triggers. A service spec walks every sort order page
by page with deliberate ties, to prove each row appears exactly once. There are also channel,
connection and job specs, and JWT specs for expiry, forged tokens and `alg: none`.

---

## Frontend

### State management

| State | Where it lives | Why |
| --- | --- | --- |
| Search results, watchlist, saved searches | **TanStack Query** cache | Request de-duplication, `useInfiniteQuery` for cursors, optimistic mutations, a single place for real-time patches |
| Session | **AuthContext** (Context + `useReducer`) | Small, global, rarely changes; restores and validates the token on boot; a global 401 handler signs out |
| Toasts | **ToastContext**, with actions and state in separate contexts | Components that only raise toasts never re-render when the toast list changes |
| Filters | **The URL query string** | Shareable, survives reloads, back and forward work; saved searches are URLs |
| WebSocket | **RealtimeProvider** | One subscription while signed in; events patch the Query cache |

When a `property.updated` event arrives, `applyWatchlistEvent` patches that property in **every
cached search page and the watchlist**, so it updates everywhere at once. Only the affected page and
card get new object identities.

### Performance

- **Memoised cards:** `PropertyCard` is wrapped in `memo` and receives a primitive `isWatched` plus
  handlers that never change identity (`useStableCallback`). Toggling one heart or receiving a live
  update re-renders one card, not the whole list (there is a test for this).
- **Infinite scroll:** an `IntersectionObserver` sentinel starts loading 800px early. It re-arms
  after each page, which handles tall screens, and stops on errors instead of retrying in a loop.
  A "Load more" button is kept for accessibility.
- **Long lists:** cards use `content-visibility: auto`, so off-screen cards skip layout and paint.
  For thousands of results I'd add windowing (TanStack Virtual) and `maxPages`.
- **Filter changes:** `keepPreviousData` keeps the old results on screen (dimmed) while new ones
  load, so there's no flash of skeletons. The keyword box is debounced, and request `AbortSignal`s
  cancel superseded searches.
- **Code splitting:** the watchlist and auth routes are lazy-loaded. Hashed assets are cached for a
  year by nginx.

### Loading and error states

- **Loading:** skeleton grid on first load; "Updating…" dimming when filters change; a spinner
  while the next page loads.
- **Errors:** an error state with retry, inline for a failed next page; toasts for failed mutations,
  which roll back; field-level errors on signup.
- **Other states:** empty states with a "clear filters" action; an error boundary around each route;
  a live-connection indicator.

### Tests (Jest + React Testing Library)

Most tests render the real routes and providers against an in-memory router with a mocked API module.

- **Search:** results, URL ⇄ filter sync, infinite scroll, error and retry, empty state, sign-in
  redirect, and optimistic watch with rollback.
- **Auth:** login redirect back to the original page, server errors, field errors, and session
  restore.
- **Real-time:** subscription, live price update with toast, cross-tab sync, and disconnect on sign out.
- **API client:** auth headers, query building, the error envelope, 401 sign-out (but not for a wrong
  password), non-JSON error pages, network failures, and silent aborts. These run against a stubbed
  `fetch`, beneath the mocked API module the page tests use.
- **Units:** filter parsing and round-trips, cache patching keeps untouched object identities,
  debounced input, and memoisation.

---

## Trade-offs and next steps

- **Notifications for saved searches**, e.g. "3 new matches". The data model supports it: a
  scheduled job runs each saved search with `listed_at > last_notified_at`.
- **Watchlist size:** the watchlist returns up to 500 items without pagination. That's realistic
  for a personal list, but it would get the same cursor pagination as search if it needed to grow.
- **Search cache invalidation is global:** any property write rotates the version. That's simple
  and always correct, but at high write volume I'd version per suburb or segment, or lean on short
  TTLs plus ETags.
- **Total counts:** `total_count` is exact. At millions of rows I'd switch to an estimate or a capped
  count.
- **Images:** seeded listings have no photos. Cards render a type-specific illustration, and
  `image_url` is supported (lazy-loaded) when present.
- **Bleeding-edge versions:** the frontend uses TypeScript 7, Vite 8 and React Router 8. Jest runs
  through Babel with a small `import.meta` shim and a jsdom environment that exposes Node's Fetch
  API, which React Router's data router needs.
