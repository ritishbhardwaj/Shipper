# Shipper — Debugging & Fixes Log

This document records **every major problem** encountered while building and debugging the Shipper project, **how each issue was diagnosed**, and **exactly what was changed** to fix it. It is written as a chronological troubleshooting log so you can reproduce the investigation or avoid the same pitfalls later.

**Project:** Shipper (FastAPI backend + React Router 7 frontend + SQLite)  
**Primary database file:** `backend/shipper_Test.db`  
**Default API URL (frontend):** `http://127.0.0.1:8001`

---

## Table of contents

1. [Initial state of the project](#1-initial-state-of-the-project)
2. [Redis → SQLite JWT blacklist](#2-redis--sqlite-jwt-blacklist)
3. [Seller signup: HTTP 405 Method Not Allowed](#3-seller-signup-http-405-method-not-allowed)
4. [Browser noise: lsihookContent.js and Chrome DevTools](#4-browser-noise-lsihookcontentjs-and-chrome-devtools)
5. [Seller signup/sign-in: HTTP 500 (passlib + bcrypt)](#5-seller-signupsign-in-http-500-passlib--bcrypt)
6. [Login: React “Maximum update depth exceeded”](#6-login-react-maximum-update-depth-exceeded)
7. [Port 8000 already in use](#7-port-8000-already-in-use)
8. [Shipment create: `_sa_instance_state` / assign_shipment crash](#8-shipment-create-_sa_instance_state--assign_shipment-crash)
9. [Partner dashboard: HTTP 500 Pydantic validation](#9-partner-dashboard-http-500-pydantic-validation)
10. [Shipment update: `KeyError: 'description'`](#10-shipment-update-keyerror-description)
11. [Status not persisting / seller not seeing partner updates](#11-status-not-persisting--seller-not-seeing-partner-updates)
12. [Status still broken: root cause — UUID foreign key mismatch](#12-status-still-broken-root-cause--uuid-foreign-key-mismatch)
13. [Files changed (reference index)](#13-files-changed-reference-index)
14. [How to run after all fixes](#14-how-to-run-after-all-fixes)
15. [Lessons learned](#15-lessons-learned)

---

## 1. Initial state of the project

### What existed

| Area | State |
|------|--------|
| **Backend** | FastAPI app with sellers, delivery partners, shipments, JWT auth, timeline via `ShipmentEvent` |
| **Redis** | Used only for JWT logout blacklist (`jti` keys) |
| **Database** | SQLite `shipper_Test.db`; config also mentioned Postgres/Redis in `.env` but runtime used SQLite |
| **Frontend (`frontend/`)** | React Router 7 + shadcn UI; login/signup UI **not** wired to API |
| **Frontend (`frontend_normal_react/`)** | Old Vite prototype; broken axios calls |

### Gaps identified at audit

- No CORS on `main.py` (middleware lived in unused `middlewares.py`)
- `ShipmentService.add()` passed `status=` to `Shipment()` but `status` was removed from the model (computed from timeline)
- `BaseService._delete()` never called `commit()`
- `decode_access_token()` returned a dict on error instead of `None` → bad auth behavior
- `create_db_tables()` only imported `Shipment`, not all models
- Vite `/api` proxy conflict with React Router dev server
- `passlib` + modern `bcrypt` incompatibility on Windows/Python 3.12

---

## 2. Redis → SQLite JWT blacklist

### Requirement

User asked to **remove Redis** and store JWT blacklist in **SQLite only**. Old Redis code must remain **commented**, with **new** implementation alongside it.

### What Redis did

- On logout: `SET jti → "blacklisted"` in Redis db `0`
- On each request: `EXISTS jti` before accepting token

### Implementation

| Step | Action |
|------|--------|
| 1 | Added SQLModel table `TokenBlacklist` (`jti` PK, `expires_at`) in `backend/app/database/models.py` |
| 2 | Replaced active code in `backend/app/database/redis.py`; **commented out** entire old `redis.asyncio` block |
| 3 | New functions: `add_jti_to_blacklist(jti, expires_at)`, `is_jti_blacklisted(jti)` using a short-lived async session against SQLite |
| 4 | Logout handlers pass JWT `exp` as `expires_at` so rows expire naturally |
| 5 | Removed `redis[hiredis]` from `requirements.txt` (left commented note) |
| 6 | Made `REDIS_*` optional/removed from required config in `config.py` |
| 7 | Included `TokenBlacklist` in `create_db_tables()` imports |
| 8 | Commented `backend/testRedis.py` with explanation |

### Files

- `backend/app/database/redis.py`
- `backend/app/database/models.py`
- `backend/app/database/session.py`
- `backend/app/api/routers/seller.py`, `delivery_partner.py`
- `backend/requirements.txt`

---

## 3. Seller signup: HTTP 405 Method Not Allowed

### Symptom

Browser console:

```text
POST http://localhost:5174/api/seller/signup 405 (Method Not Allowed)
```

Backend route `POST /seller/signup` was correct and worked when hit directly.

### Diagnosis

| Step | Finding |
|------|---------|
| 1 | Frontend used `API_BASE = "/api"` and Vite `server.proxy` to forward to `http://127.0.0.1:8000` |
| 2 | Dev server ran on **5174** (5173 was busy) |
| 3 | **React Router 7 SSR dev handler** handled `POST /api/...` **before** the proxy |
| 4 | No matching route for `/api/seller/signup` → framework returned **405** |
| 5 | Terminal also showed harmless `No route matches URL "/.well-known/appspecific/com.chrome.devtools.json"` (Chrome DevTools) |

### Fix

| Step | Action |
|------|--------|
| 1 | Changed default API base to **direct backend URL**: `http://127.0.0.1:8001` in `frontend/app/lib/api.ts` |
| 2 | Added `frontend/.env` with `VITE_API_URL=http://127.0.0.1:8001` |
| 3 | Added `frontend/.env.example` |
| 4 | Simplified `vite.config.ts` (removed broken custom pre-proxy plugin attempt) |
| 5 | Updated backend CORS to `allow_origin_regex` for any `localhost` / `127.0.0.1` port |

### Files

- `frontend/app/lib/api.ts`
- `frontend/.env`, `frontend/.env.example`
- `frontend/vite.config.ts`
- `backend/app/main.py`

---

## 4. Browser noise: lsihookContent.js and Chrome DevTools

### Symptom

```text
Uncaught TypeError: Cannot read properties of undefined (reading 'bid')
  at LsiHandleResponse (lsihookContent.js:1:1272)
```

### Diagnosis

- Script name `lsihookContent.js` → **browser extension** (not Shipper code)
- Unrelated to signup/API

### Action

No code change. Safe to ignore or disable extension while testing.

---

## 5. Seller signup/sign-in: HTTP 500 (passlib + bcrypt)

### Symptom

Backend traceback on `POST /seller/signup`:

```text
AttributeError: module 'bcrypt' has no attribute '__about__'
ValueError: password cannot be longer than 72 bytes ...
```

Password in logs was short (e.g. `Rit@0987`) — error came from **passlib’s bcrypt backend self-test**, not from user password length.

### Diagnosis

| Step | Finding |
|------|---------|
| 1 | `user.py` used `passlib.context.CryptContext(schemes=["bcrypt"])` |
| 2 | Installed `bcrypt` version incompatible with passlib’s version detection (`__about__` removed in newer bcrypt) |
| 3 | `requirements.txt` pinned `bcrypt==4.0.1` but environment could have different version |
| 4 | Verified fix with: `pip install "bcrypt>=4.0.1,<5"` and direct `hash_password` / `verify_password` test → `bcrypt ok` |

### Fix

| Step | Action |
|------|--------|
| 1 | Removed passlib usage entirely |
| 2 | Implemented `hash_password()` / `verify_password()` with **`bcrypt` directly** in `backend/app/services/user.py` |
| 3 | `_add_user` now `payload.pop("password")` before constructing model (avoids passing password into SQLModel kwargs) |
| 4 | Updated `requirements.txt`: `bcrypt>=4.0.1,<5`, removed `passlib` |

### Files

- `backend/app/services/user.py`
- `backend/requirements.txt`

---

## 6. Login: React “Maximum update depth exceeded”

### Symptom

- `POST /seller/token` returned **200 OK** (login succeeded on server)
- Browser: `Maximum update depth exceeded` at `login.tsx` line ~20

### Diagnosis (first attempt)

`login.tsx` called `navigate()` **during render** when `isAuthenticated`:

```tsx
if (isAuthenticated) {
  navigate(...);  // illegal — triggers re-render loop
}
```

### Fix (first attempt)

Replaced with `<Navigate replace />` during render — **still problematic** combined with redirect ping-pong.

### Diagnosis (second attempt — full picture)

| Step | Finding |
|------|---------|
| 1 | `AuthProvider` initialized `auth = null`, then `useEffect` read localStorage |
| 2 | Login page redirected to dashboard when token existed |
| 3 | `ProtectedRoute` saw `!isAuthenticated` **before** hydration → sent user back to `/login` |
| 4 | Login sent user to dashboard again → **infinite redirect loop** |

### Fix (final)

| Step | Action |
|------|--------|
| 1 | Added `ready` flag to auth context; `false` until client reads `localStorage` |
| 2 | `ProtectedRoute` shows “Loading…” until `ready` |
| 3 | Login page: **no `<Navigate>` during render** |
| 4 | Redirect only in `useEffect` with `useRef` guard **or** in `handleLoginSuccess` after form submit |
| 5 | `handleLoginSuccess`: `saveAuth` + `navigate` once |

### Files

- `frontend/app/lib/auth.tsx`
- `frontend/app/routes/login.tsx`
- `frontend/app/components/protected-route.tsx`

---

## 7. Port 8000 already in use

### Symptom

```text
[WinError 10048] only one usage of each socket address ...
```

`GET http://127.0.0.1:8000/health` returned another app’s HTML (`tdmactionsfrontend`).

### Fix

Documented and defaulted to **port 8001**:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Frontend `.env`: `VITE_API_URL=http://127.0.0.1:8001`

---

## 8. Shipment create: `_sa_instance_state` / assign_shipment crash

### Symptom

```text
AttributeError: 'Shipment' object has no attribute '_sa_instance_state'
  at partner.shipments.append(shipment)
```

### Diagnosis

| Step | Finding |
|------|---------|
| 1 | `ShipmentService.add()` built a draft with `Shipment.model_construct(...)` |
| 2 | `assign_shipment()` did `partner.shipments.append(shipment)` on **non-persisted** instance |
| 3 | SQLAlchemy relationship `append()` requires a mapped instance with `_sa_instance_state` |

### Fix

| Step | Action |
|------|--------|
| 1 | Changed `assign_shipment(self, destination: int)` — only picks partner by zip + capacity |
| 2 | Removed `partner.shipments.append(shipment)` |
| 3 | Build real `Shipment(..., delivery_partner_id=partner.id)` and `_add()` to DB |

### Files

- `backend/app/services/deliver_partner.py`
- `backend/app/services/shipment.py`

---

## 9. Partner dashboard: HTTP 500 Pydantic validation

### Symptom

```text
ValidationError: DeliveryPartnerDashboard
assigned_shipments.0.seller
  Input should be a valid dictionary or instance of SellerBase
  input_type=Seller
```

### Diagnosis

- Pydantic v2 needs `model_config = ConfigDict(from_attributes=True)`
- Old `class Config: from_attributes = True` on nested models was insufficient
- Dashboard passed raw ORM graphs into constructor

### Fix

| Step | Action |
|------|--------|
| 1 | Updated schemas to Pydantic v2 `ConfigDict(from_attributes=True)` |
| 2 | Added `ShipmentEventRead` (don’t embed raw ORM event types in API schema) |
| 3 | Dashboard: `DeliveryPartnerRead.model_validate(partner)` and `ShipmentRead.model_validate(s)` (later `from_shipment`) |

### Files

- `backend/app/api/schemas/seller.py`
- `backend/app/api/schemas/shipment.py`
- `backend/app/api/schemas/delivery_partner.py`
- `backend/app/api/routers/delivery_partner.py`

---

## 10. Shipment update: `KeyError: 'description'`

### Symptom

```text
PATCH /shipment/?id=...
KeyError: 'description'
  at shipment.py line 76
```

### Diagnosis

- Router: `shipment_update.model_dump(exclude_none=True)` — optional fields **omitted** when `None`
- Service used `updated_data['description']` and `updated_data['location']` as **required keys**

### Fix

```python
location = shipment_update.get("location")
new_status = shipment_update.get("status")
if location is not None or new_status is not None:
    await self.event_service.add(
        shipment=shipment,
        location=location,
        description=shipment_update.get("description"),
        shipment_status=new_status,
    )
```

### Files

- `backend/app/services/shipment.py`
- `backend/app/api/routers/shipment.py` (returns `ShipmentRead.from_shipment` after patch)

---

## 11. Status not persisting / seller not seeing partner updates

### User report

- Partner sets status to **out for delivery**, refresh shows **in transit** again
- Seller dashboard does not reflect partner updates

### First hypothesis (partially true)

- Status is **not a column** on `shipment`; it is derived from **latest** `ShipmentEvent` in `timeline`
- `Shipment.status` used `timeline[-1]` without guaranteed sort order
- Multiple events in same second → unstable ordering
- Frontend `defaultValue` on `<select>` could confuse UI after reload

### First round of fixes

| Change | Purpose |
|--------|---------|
| `Relationship(order_by="ShipmentEvent.created_at")` | Ordered timeline from DB |
| `status` property uses `max(timeline, key=(created_at, id))` | Latest event |
| Append event to `shipment.timeline` after create | In-memory consistency |
| `refresh(shipment, ["timeline", "seller"])` after update | Reload relationship |
| `ShipmentRead` validator / `from_shipment` | Correct serialized `status` |
| Seller: **Refresh** button + `window.focus` reload | See partner changes |
| Partner: sort timeline in UI; `key` on card/select | Form reflects server state |

### Database inspection (revealed events existed)

```sql
-- Example shipment 782e4f2c-... had events IN DB:
-- placed → out_for_delivery → in_transit (newer timestamp)
```

So sometimes “revert to in_transit” was **correct** per latest row — user may have saved twice or form sent `in_transit` after `out_for_delivery`.

**This did not explain empty timelines on list endpoints.**

---

## 12. Status still broken: root cause — UUID foreign key mismatch

### User report

“Not working at all” after previous status fixes.

### Critical test

```python
# Loaded shipments from DB
for ship in shipments:
    print(len(ship.timeline))  # ALWAYS 0

# But raw SQL:
SELECT COUNT(*) FROM shipment_event;  # 14 rows
```

### Format comparison

| Table | Example `id` / `shipment_id` format |
|-------|-------------------------------------|
| `shipment.id` | `57bf3266-eb9e-40d8-b87c-ac4ec4ff2af9` (36 chars, **with dashes**) |
| `shipment_event.shipment_id` (before fix) | `57bf3266eb9e40d8b87cac4ec4ff2af9` (32 chars, **no dashes**) |

### Why

| Model field | Column type |
|-------------|-------------|
| `Shipment.id` | `Column(GUID(), ...)` → stores UUID **with dashes** |
| `ShipmentEvent.shipment_id` | `Field(foreign_key="shipment.id")` only → SQLAlchemy stored **hex without dashes** |

**SQLAlchemy relationship `Shipment.timeline` never joined** → empty timeline → `status` always `None` or wrong → seller and partner APIs lied.

### Verification after repair

```text
65312258-f02d-45e6-b2d2-01015ca9c91e events 3 status in_transit
```

### Fix (detailed steps)

| Step | Action |
|------|--------|
| 1 | `ShipmentEvent.shipment_id` → `Column(GUID(), ForeignKey("shipment.id"))` |
| 2 | `Shipment.delivery_partner_id` → same `GUID()` FK pattern for consistency |
| 3 | Added `_normalize_uuid_string()` and `_repair_legacy_uuid_fks()` in `session.py` |
| 4 | On every `create_db_tables()` / startup: `UPDATE shipment_event SET shipment_id = <dashed>` where needed |
| 5 | `selectinload(Shipment.timeline)` + `selectinload(Shipment.seller)` on get/list/update |
| 6 | `ShipmentRead.from_shipment()` builds sorted timeline + explicit `status` |
| 7 | `ShipmentEventService.add()` uses `flush()` + explicit `created_at` (UTC); parent service **one** `commit()` |
| 8 | After update: `return await self.get(id)` to return fully loaded entity |
| 9 | List/dashboard endpoints use `ShipmentRead.from_shipment(s)` |

### Files

- `backend/app/database/models.py`
- `backend/app/database/session.py`
- `backend/app/services/shipment.py`
- `backend/app/services/shipment_event.py`
- `backend/app/api/schemas/shipment.py`
- `backend/app/api/routers/shipment.py`
- `backend/app/api/routers/delivery_partner.py`

### Task verification (automated)

Shell task **“Run FK repair and verify timeline loads”** → exit 0:

- Repair migration ran
- Sample shipment showed `events 3` and `status in_transit` aligned with DB

---

## 13. Files changed (reference index)

### Backend — core

| File | Topics |
|------|--------|
| `app/main.py` | CORS regex, health route, lifespan |
| `app/config.py` | SQLite defaults, Redis removed from required env |
| `app/utils.py` | JWT encode/decode; removed passlib demo code |
| `app/database/models.py` | `TokenBlacklist`, GUID FKs, timeline `order_by`, `status` property |
| `app/database/session.py` | All models in `create_all`, UUID FK repair |
| `app/database/redis.py` | SQLite blacklist; Redis commented |
| `app/services/user.py` | bcrypt hash/verify |
| `app/services/base.py` | `_delete` commits; `_update` fixed |
| `app/services/shipment.py` | create/update/list/get with selectinload |
| `app/services/shipment_event.py` | flush-based add, enum coercion |
| `app/services/deliver_partner.py` | `assign_shipment(destination)` |
| `app/api/schemas/*.py` | Pydantic v2, `from_shipment` |
| `app/api/routers/*.py` | cleaned routes, model_validate/from_shipment |
| `requirements.txt` | bcrypt, email-validator, no redis |

### Frontend

| File | Topics |
|------|--------|
| `app/lib/api.ts` | direct API URL, typed client |
| `app/lib/auth.tsx` | `ready`, localStorage hydration |
| `app/routes/login.tsx` | no render-time navigate loop |
| `app/components/protected-route.tsx` | wait for `ready` |
| `app/routes/seller-dashboard.tsx` | Refresh, sorted timeline |
| `app/routes/partner-dashboard.tsx` | sorted timeline, select keys |
| `.env` / `.env.example` | `VITE_API_URL` |

### Docs / root

| File | Topics |
|------|--------|
| `README.md` | run instructions |
| `docs/DEBUGGING-AND-FIXES.md` | this document |

---

## 14. How to run after all fixes

### Backend

```powershell
cd backend
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

On startup you should see SQL logs for `create_all` and the `SELECT id, shipment_id FROM shipment_event` repair query.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Ensure `frontend/.env` contains:

```env
VITE_API_URL=http://127.0.0.1:8001
```

### End-to-end test checklist

1. **Partner signup** with zip codes e.g. `10001, 10002`, capacity `5`
2. **Seller signup** with zip code e.g. `10001`
3. **Seller login** → dashboard loads (no React depth error)
4. **Create shipment** to destination zip serviced by partner
5. **Partner login** → dashboard lists shipment with **timeline** (not empty)
6. **Partner** update status → new timeline row → status header updates after reload
7. **Seller** click **Refresh** (or refocus tab) → same status and timeline entries

### If old data still looks wrong

- Events created **before** UUID repair may reference deleted shipments or have no matching parent
- Prefer **new shipments** after one backend restart (repair runs once)
- Or delete `shipper_Test.db` and let the app recreate schema (dev only)

---

## 15. Lessons learned

1. **One UUID format everywhere** — use the same `GUID()` column type for all UUID foreign keys; do not mix `Field(foreign_key=...)` plain UUID with custom GUID PKs.

2. **Do not `navigate()` during React render** — use `useEffect`, event handlers, or `<Navigate>` carefully with hydration guards.

3. **Auth + protected routes** — wait until client storage is read (`ready`) before redirecting unauthenticated users.

4. **React Router dev server ≠ Vite proxy** — `/api` from browser may hit the framework first; direct `VITE_API_URL` to FastAPI is simpler.

5. **passlib + bcrypt** — on Python 3.12, prefer **`bcrypt` directly**.

6. **Shipment status** — if derived from events, relationships **must load**; verify with `len(shipment.timeline)` in a shell, not only raw SQL row counts.

7. **Optional JSON fields** — use `.get()` after `exclude_none=True`, never required-key access.

8. **SQLAlchemy `append()`** — only on persisted instances; assign partners by query, not by appending drafts to collections.

---

## Appendix A — Command cheat sheet used during debugging

```powershell
# Backend import check
cd backend
python -c "from app.main import app; print('import ok')"

# bcrypt check
python -c "from app.services.user import hash_password, verify_password; h=hash_password('test'); assert verify_password('test', h)"

# Inspect SQLite
python -c "
import sqlite3
conn = sqlite3.connect('shipper_Test.db')
cur = conn.cursor()
cur.execute('SELECT id FROM shipment LIMIT 3')
print('shipments:', cur.fetchall())
cur.execute('SELECT shipment_id, status, created_at FROM shipment_event')
for r in cur.fetchall(): print(r)
conn.close()
"

# Timeline load test (async)
python -c "import asyncio; ... selectinload(Shipment.timeline) ..."
```

---

## Appendix B — API endpoints (post-fix)

| Method | Path | Role |
|--------|------|------|
| POST | `/seller/signup` | Register seller |
| POST | `/seller/token` | Seller login |
| GET | `/seller/logout` | Seller logout (blacklist) |
| GET | `/seller/dashboard` | Seller profile |
| POST | `/delivery_partner/signup` | Register partner |
| POST | `/delivery_partner/token` | Partner login |
| GET | `/delivery_partner/dashboard` | Partner + assigned shipments |
| GET | `/shipment/mine` | Seller’s shipments |
| GET | `/shipment/assigned` | Partner’s shipments |
| POST | `/shipment/` | Create shipment |
| PATCH | `/shipment/?id=<uuid>` | Partner updates timeline |
| DELETE | `/shipment/?id=<uuid>` | Seller deletes own shipment |
| GET | `/health` | Health check |

---

*Document generated from the full Cursor debugging session on the Shipper repository. Update this file when new production issues are fixed so the log stays authoritative.*
