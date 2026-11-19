# Landchecker Senior Fullstack Challenge: Property Search

Search Melbourne property listings by price, bedrooms, property type, status and distance, keep a
personal watchlist, and get a live alert when a watched property's price or status changes.

- **Backend:** Rails 8.1 API, PostgreSQL 17, Redis, ActionCable, JWT auth, RSpec (93 examples)
- **Frontend:** React 19, TypeScript, TanStack Query, React Router, Tailwind, Jest + React Testing Library (55 tests)

## Notes for reviewers

> **TODO before submitting:** fill in the two lines below, then delete this note.

- **Time spent:** _TODO: hours spent, and what you would cut to fit the 3–4 hour guide._
- **AI assistance:** _TODO: what AI tools were used for, in line with Landchecker's guidance._
- **Where to start reading:** [`PropertySearch`](backend/app/services/property_search.rb) (filters,
  indexes, cursor pagination), [`PropertiesController`](backend/app/controllers/api/v1/properties_controller.rb)
  (caching), [`useSearchFilters`](frontend/src/hooks/useSearchFilters.ts) and
  [`RealtimeProvider`](frontend/src/realtime/RealtimeProvider.tsx).
- **Design notes:** the API reference, schema, query plans, caching and auth details are in
  [docs/DESIGN.md](docs/DESIGN.md).

---

## Quick start

You only need Docker. Ruby, Postgres and Redis all run in containers.

```bash
docker compose up
```

Then open **http://localhost:5173**. The first boot takes about two minutes: it installs
dependencies, creates the database and seeds 5,000 Melbourne listings, a demo user and an admin user.

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

Each price or status change on a watched property shows up as a toast, a highlighted price and an
updated "down $X since you saved it" line, without a page reload. An admin can make the same change
through the API:

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

The Rails production image runs behind nginx, which serves the built SPA and proxies `/api` and
`/cable`, so the browser talks to a single origin. All configuration comes from environment variables
(`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY_BASE`, `CORS_ORIGINS`, rate limits, SSL flags).

```bash
SECRET_KEY_BASE=$(openssl rand -hex 64) docker compose -f docker-compose.prod.yml up --build
# http://localhost:8080
```

---

## Requirements checklist

### Functional

| Requirement | How it is met | Where |
| --- | --- | --- |
| Search with results | Keyword search, sort, result count, loading, empty and error states | [SearchPage](frontend/src/pages/SearchPage.tsx), [PropertySearch](backend/app/services/property_search.rb) |
| Infinite scroll | Cursor pagination; an `IntersectionObserver` loads the next page early, with a "Load more" fallback | [useInfiniteScroll](frontend/src/hooks/useInfiniteScroll.ts), [usePropertySearch](frontend/src/hooks/usePropertySearch.ts) |
| Save and remove properties | Idempotent watchlist API; the UI updates instantly and rolls back on failure | [WatchlistItemsController](backend/app/controllers/api/v1/watchlist_items_controller.rb), [useWatchlist](frontend/src/hooks/useWatchlist.ts) |
| Filter by price, bedrooms, type | Plus listing status and radius; filters live in the URL, so searches are shareable | [filters.ts](frontend/src/lib/filters.ts), [FilterBar](frontend/src/components/search/FilterBar.tsx) |

### Backend

| Requirement | How it is met | Where |
| --- | --- | --- |
| RESTful API | Versioned `/api/v1` resources with conventional status codes (201, 204, 401, 403, 404, 409, 422, 429) | [routes.rb](backend/config/routes.rb) |
| Schema design | Postgres enums, check constraints, cascading foreign keys, a unique index on the watchlist join | [schema.rb](backend/db/schema.rb) |
| Indexing | One composite index per sort order, trigram GIN for address text, GiST for location; [query plans](docs/DESIGN.md#indexing-and-query-plans) at 105k rows | [migrations](backend/db/migrate) |
| Authentication | JWT plus bcrypt, timing-safe login, admin role | [JsonWebToken](backend/app/services/json_web_token.rb), [Authentication](backend/app/controllers/concerns/authentication.rb) |
| ActionCable | One JWT-authenticated stream per user; changes fan out from a background job | [channels](backend/app/channels), [PropertyChangeBroadcastJob](backend/app/jobs/property_change_broadcast_job.rb) |
| Errors and validation | One JSON error envelope for every failure, with per-field details | [ErrorHandling](backend/app/controllers/concerns/error_handling.rb) |
| RSpec | 93 examples: requests, models, services, channels and jobs, including N+1 query-count guards | [spec/](backend/spec) |

### Frontend

| Requirement | How it is met | Where |
| --- | --- | --- |
| Hooks and state management | TanStack Query for server data, Context for auth and toasts, the URL for filters | [hooks/](frontend/src/hooks), [AuthContext](frontend/src/auth/AuthContext.tsx) |
| Component structure | `pages/` wire `hooks/` to presentational `components/`; API, auth and realtime are separate modules | [src/](frontend/src) |
| Loading and error states | Skeletons, dimmed results while refetching, retry, empty states, an error boundary, toasts | [states.tsx](frontend/src/components/common/states.tsx) |
| WebSocket integration | Live events patch cached search results and the watchlist in place | [realtime/](frontend/src/realtime) |
| Jest / React Testing Library | 55 tests across pages, the API client, realtime and units | `frontend/src/**/*.test.ts(x)` |
| Rendering performance | Memoised cards with stable callbacks (a test checks only one card re-renders), `content-visibility`, lazy routes | [PropertyCard](frontend/src/components/property/PropertyCard.tsx) |

### Bonus

| Bonus | How it is met | Where |
| --- | --- | --- |
| Rate limiting | Rails 8 `rate_limit` backed by Redis; stricter on login and signup | [RateLimited](backend/app/controllers/concerns/rate_limited.rb) |
| Caching | Redis search cache plus `ETag` / 304 responses that run no SQL | [PropertiesController](backend/app/controllers/api/v1/properties_controller.rb) |
| Docker and environment config | Dev stack and a production stack behind nginx, configured by environment variables | [docker-compose.yml](docker-compose.yml), [docker-compose.prod.yml](docker-compose.prod.yml) |
| Advanced search | "Nearby" radius search sorted by distance; saved searches | [PropertySearch](backend/app/services/property_search.rb), [SavedSearchesMenu](frontend/src/components/search/SavedSearchesMenu.tsx) |
| Real-time watched-property updates | Price and status changes reach watchers as toasts and in-place card updates | [RealtimeProvider](frontend/src/realtime/RealtimeProvider.tsx) |

---

## Key decisions

- **Cursor pagination instead of `OFFSET`:** page 100 costs the same as page 1, and rows added
  mid-scroll can't cause duplicates or gaps. Searches take 0.1–1.6 ms on 105,000 listings
  ([plans](docs/DESIGN.md#indexing-and-query-plans)).
- **No N+1 by construction:** associations are preloaded and `strict_loading` makes a lazy load
  fail. Specs assert that search stays at 3 queries and the watchlist at 4.
- **Property JSON is the same for every user,** so Redis and HTTP caches can share it. Whether a
  property is watched is worked out in the browser from the watchlist.
- **One WebSocket stream per user:** a browser holds one subscription however many properties it
  watches, and a background job fans each change out to the watchers.
- **State lives where it belongs:** server data in TanStack Query, the session in Context, filters
  in the URL. Redux would only duplicate the Query cache.
- **JWT in `localStorage`** keeps the SPA and the WebSocket handshake simple. It is readable by XSS;
  in production I'd use a short-lived token in memory plus an httpOnly refresh cookie.

## Trade-offs and next steps

- **Saved-search alerts,** e.g. "3 new matches". The data model supports it: a scheduled job runs
  each saved search with `listed_at > last_notified_at`.
- **Missed live events:** events sent while a browser is offline are not replayed; data catches up
  on the next fetch. Refetching the watchlist on reconnect would close that gap.
- **Watchlist size:** the watchlist returns up to 500 items without pagination, which is realistic
  for a personal list. It would get the same cursor pagination as search if it needed to grow.
- **Search cache invalidation is global:** any property write rotates the cache version. That is
  simple and always correct; at high write volume I'd version per suburb or lean on short TTLs.
- **Total counts are exact.** At millions of rows I'd switch to an estimate or a capped count.
- **Background jobs use the in-process `async` adapter** to keep the stack small. Production would
  use Sidekiq or Solid Queue.
- **Images:** seeded listings have no photos. Cards draw a type-specific illustration, and
  `image_url` is supported when present.
