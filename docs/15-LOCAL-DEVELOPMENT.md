# Run the CRYO ERP foundation locally

## Install

Use Node.js 26.13.0. The root workspace lockfile installs both packages. Use `npm.cmd` in PowerShell if script execution is restricted. [Node.js release schedule](https://nodejs.org/en/about/previous-releases)

```powershell
npm ci
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
node -p "require('node:crypto').randomBytes(32).toString('base64url')"
```

Paste the generated value into `JWT_SECRET` in `server/.env`. Keep it private. The examples use frontend `127.0.0.1:5173`, backend `127.0.0.1:4000` and MongoDB `127.0.0.1:27018`. Keep the browser hostname consistent with `APP_ORIGINS`. Add exact origins separated by commas if needed.

## Start a local MongoDB replica set

With Docker running, use `docker compose up -d mongo`. With an installed Windows `mongod`, the equivalent local sequence is:

```powershell
New-Item -ItemType Directory -Force .mongo | Out-Null
mongod --dbpath .mongo --replSet cryo-rs --port 27018 --bind_ip 127.0.0.1
```

Keep the native process running. In a second terminal, run `npm run db:init`. This initializes the loopback replica only and waits for a writable primary. Set `MONGODB_URI` to an authenticated replica set or compatible managed cluster for deployed use. The API checks topology and creates declared indexes on startup. Normal application deployment should use a MongoDB user with only the privileges needed by its operating and index deployment roles. [Mongoose transactions](https://mongoosejs.com/docs/transactions.html)

## Create the first administrator

Provide `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (14–256 characters), `COMPANY_CODE` and `COMPANY_NAME` in the bootstrap process environment. The PowerShell example prompts for the password without echoing it.

```powershell
$env:ADMIN_EMAIL = Read-Host 'Work email'
$env:ADMIN_NAME = Read-Host 'Administrator name'
$env:COMPANY_CODE = Read-Host 'Company code'
$env:COMPANY_NAME = Read-Host 'Company name'
$cryoAdminSecret = Read-Host 'Administrator password' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $cryoAdminSecret).Password
try { npm run bootstrap:admin } finally { Remove-Item Env:ADMIN_PASSWORD }
```

The bootstrap transaction creates one company, one company-administrator role, the reviewed company-read grant, and an initial user and audit event. A repeat bootstrap leaves the account and password intact. Use a development database for local operation.

## Run, test and build

| Command | What it runs |
| --- | --- |
| `npm run dev:api` | Express with Node watch mode |
| `npm run dev:client` | Vite development server and same-origin API proxy. Open `http://127.0.0.1:5173` |
| `npm test` | Node tests, including real HTTP and an isolated MongoDB replica set |
| `npx playwright install chromium` | Browser binary for UI tests |
| `npm run test:ui` | Playwright with isolated MongoDB, the actual Express entry point on 4174 and Vite on 4173 |
| `npm run build` | Production assets in `client/dist/` |
| `npm run start -w server` | Non-watch Express entry point |

Tests find `mongod` on PATH or use `MONGOD_BINARY`. UI tests can use an installed Chromium browser via the `CRYO_TEST_BROWSER` executable path. Tests provision temporary databases and generate their own credentials. Keep ports 4173 and 4174 free during UI testing.

Deploy the static frontend and API behind HTTPS, preferably on one origin. Route `/api/v1` to Express and serve `index.html` for frontend deep links. The access token stays in memory and the production refresh cookie is Secure, HttpOnly and SameSite=Strict. Keep client and API on the same site so the browser can send the refresh cookie. Set `TRUST_PROXY_HOPS` only when the real forwarding topology is known. Run liveness checks against `/api/v1/health` and readiness checks against `/api/v1/ready`. [API contract](07-API-MAPPING.md) · [Authentication](08-AUTHENTICATION-PERMISSIONS.md)
