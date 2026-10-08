# Work Pilot — Mini ERP with Agentic AI

A deployable MERN starter with company-isolated MongoDB records, login, dashboards, a Groq-backed business chat, department-agent routing, document imports, and personal profile editing. **This is not a certified production-complete ERP.** It does not claim to send emails, collect payments, transcribe audio, or execute unimplemented integrations.

## Run locally
1. Install Node.js 20+ and MongoDB 7+.
2. Copy `server/.env.example` to `server/.env`. Set `JWT_SECRET`, `MONGODB_URI`, and `GROQ_API_KEY`.
3. For Google sign-in, create an OAuth app with callback URL `http://localhost:4000/api/auth/oauth/google/callback`, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `API_ORIGIN`, and `CLIENT_ORIGIN`.
4. `npm install`
5. `npm run dev`
6. Open http://localhost:5173 and register a company.

## Deployment
Build client with `npm run build`; serve `client/dist` on a static host. Deploy `server` as a persistent Node service with MongoDB Atlas. Set `CLIENT_ORIGIN` and `API_ORIGIN` to the deployed frontend and backend origins, and configure a frontend reverse proxy for `/api` to your backend. Register each OAuth callback URL with its provider. Never expose the Groq key in the browser. Use HTTPS and secure secret storage.

## Supported real functionality
- Register/login, bcrypt password hashing, signed JWTs, tenant-scoped MongoDB records, and Google OAuth using verified provider identities and one-time app-token exchange.
- Create/list/update/delete records via authenticated APIs; dashboard figures derived only from stored records.
- Authenticated team members can import `.xlsx`, `.docx`, and text-based `.pdf` files up to 5 MB. The agents suggest categorized records/tasks for review; only selected suggestions are saved. Scanned PDFs and legacy `.doc` files are not supported.
- Groq-powered conversational assistant with recent company-record context, department-agent routing, database-derived insights, and company-scoped search/create/update tools. Explicit user chat instructions can create or edit records; deletes are not exposed as an agent tool.
- The five department agents and orchestrator implementation are in `server/src/agents/`.
- Imported documents are reviewed before selected suggestions are saved as company-scoped records and assigned to finance, sales, HR, or knowledge agents.
- Users can update their own display name, job title, location, and timezone; account email, company, and role remain outside the profile editor.

## Before a real business rollout
Implement durable human approval workflows, per-resource RBAC, audited mutation execution, input sanitization for arbitrary `details`, secure session lifecycle and refresh tokens, data retention and deletion, background jobs, transactional invoice logic, provider integrations, rate limits by user/tenant, observability, automated integration/e2e/security tests, backups, and compliance review. Current implementation is a functional foundation, not a complete enterprise system.
