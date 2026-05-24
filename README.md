# Shipper

**Shipment at ease.** A small logistics platform where sellers create shipments and delivery partners fulfill them, with event-based tracking.

## Stack

| Layer | Tech |
|-------|------|
| API | FastAPI, SQLModel, SQLite (`shipper_Test.db`) |
| Auth | JWT (PyJWT), logout blacklist in **SQLite** (not Redis) |
| UI | React Router 7, Tailwind, shadcn/ui |

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # edit JWT_SECRET if needed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/scalar

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (or the next free port, e.g. 5174). The frontend calls the API at `VITE_API_URL` (default `http://127.0.0.1:8001` — see `frontend/.env`).

## Roles

1. **Seller** — sign up, log in, create shipments (max 25 kg), view timeline, delete own shipments.
2. **Delivery partner** — sign up with serviceable zip codes and capacity, receive auto-assigned shipments, update status/location on the timeline.

## API overview

| Prefix | Purpose |
|--------|---------|
| `/seller` | signup, token, logout, dashboard |
| `/delivery_partner` | signup, token, logout, dashboard, profile update |
| `/shipment` | CRUD + `/mine` (seller) + `/assigned` (partner) |

## Redis → SQLite

JWT logout blacklist previously used Redis (`app/database/redis.py`). The old Redis code is **commented out** in that file; blacklist rows live in the `token_blacklist` SQLite table.

## Project layout

```
backend/     FastAPI app
frontend/    React Router UI (primary)
frontend_normal_react/  early prototype (not wired)
```
