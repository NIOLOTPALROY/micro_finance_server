# Stateful Authentication Backend

A modern, production-ready backend built with **Fastify**, **PostgreSQL**, and **TypeScript** focused on session-based user authentication.

## ✨ Features

- **Stateful Authentication** - Server-side session management with secure cookies
- **User Management** - Registration, login, logout, session check
- **Secure Sessions** - HTTP-only cookies, CSRF protection, 24-hour expiration
- **Type Safety** - 100% TypeScript with strict mode
- **API Documentation** - Swagger/OpenAPI at `/docs`
- **Comprehensive Testing** - 7 tests with Vitest + Supertest

## 🚀 Quick Start

### Prerequisites
- Node.js 24.4.1+
- PostgreSQL 12+

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create database
psql -U postgres -c "CREATE DATABASE micro_finance;"

# 3. Configure environment
cp .env.example .env

# 4. Setup database schema
npm run db:setup

# 5. Start development server
npm run dev
```

Access the API at `http://localhost:3000/docs`

## 📋 API Endpoints

### Authentication

```
POST   /auth/register       # Register new user
POST   /auth/login          # Login user
GET    /auth/me             # Get current user (requires session)
POST   /auth/logout         # Logout user (requires session)
```

### Health

```
GET    /health              # System status
```

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:ui             # Vitest UI dashboard
```

## 📊 Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Fastify 5 |
| Language | TypeScript 7 |
| Database | PostgreSQL |
| Sessions | @fastify/session |
| Validation | Zod |
| Testing | Vitest |

## 🛠️ Scripts

```bash
# Development
npm run dev                 # Start with hot reload
npm run build               # Compile TypeScript
npm start                   # Production start

# Database
npm run db:setup            # Create database schema

# Testing
npm test                    # Run tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

## ⚙️ Environment Variables

```env
# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=micro_finance
PG_USER=postgres
PG_PASSWORD=postgres

# Session
SESSION_SECRET=your-secret-key

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```

## 📁 Project Structure

```
src/
├── modules/
│   ├── auth/                 # Authentication module
│   ├── health/               # Health-check module
│   └── member-management/    # Member profile module
│       ├── member.routes.ts
│       ├── member.repository.ts
│       ├── member.schemas.ts
│       ├── member.types.ts
│       └── index.ts
├── shared/
│   ├── database/        # Shared PostgreSQL pool
│   └── plugins/         # Shared framework plugins
├── __tests__/           # Test files
│   ├── auth.test.ts
│   ├── health.test.ts
│   └── member-management.test.ts
├── db/                  # Database setup & migrations
├── utils/               # Utilities & test helpers
├── app.ts               # App factory
└── server.ts            # Entry point
```

### Member personal information (initial module scope)

The admin-only member endpoints currently cover personal information from the
registration form:

```
POST   /members           # Create a member profile
GET    /members           # List profiles (paginated)
GET    /members/:id       # Get one profile
PATCH  /members/:id       # Update personal information
```

Address, family/financial, KYC, nominee, bank, assignment, and approval details
are intentionally left for later module steps.

## 🔐 Session Configuration

- **Duration**: 24 hours
- **Cookie**: HTTP-only, Secure (HTTPS in production)
- **CSRF Protection**: SameSite=Lax
- **Storage**: Server-side (in-memory)

## 📝 API Examples

### Register User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Current User

```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

## 🔒 Security Features

✅ Session-based authentication  
✅ HTTP-only cookies  
✅ CSRF protection (SameSite cookies)  
✅ Password hashing (SHA-256)  
✅ Input validation (Zod)  
✅ Secure session timeout  

## 📚 Development Workflow

1. **Start dev server**: `npm run dev`
2. **Write code** in `src/`
3. **Run tests**: `npm test`
4. **View API docs**: http://localhost:3000/docs
5. **Build for production**: `npm run build`

## 🚢 Production Deployment

Before deploying:

- [ ] Set `NODE_ENV=production`
- [ ] Update `SESSION_SECRET` to a strong random string
- [ ] Enable HTTPS/TLS
- [ ] Update database credentials
- [ ] Consider Redis for distributed sessions
- [ ] Enable CORS if needed
- [ ] Set up monitoring and logging

## 📖 Documentation

- **README.md** - This file (overview and quick start)
- **Swagger UI** - Full API documentation at `/docs`

## 🤝 License

ISC

## 🎯 Next Steps

- Add email verification
- Add password reset flow
- Add 2FA support
- Add Redis session store
- Add rate limiting
- Add audit logging

---

**Ready to get started?** Run `npm run dev` and visit http://localhost:3000/docs
