# Osinct API workspace

React + TypeScript + Vite frontend with Convex Auth. The UI has one query input and renders the configured API's actual JSON response. It does not impose a made-up record schema or save queries/results in Convex.

## Run locally

```powershell
npm install
npx convex dev
# In another terminal:
npm run dev
```

## Authentication and admin access

- Email/password sign-in and account creation use Convex Auth.
- Admin is a role assigned server-side by the Convex environment variable `OSINCT_ADMIN_USER_ID`. There is no client-side admin toggle. The same sign-in form is used by users and the configured administrator.
- To configure the first admin, sign in with the intended account, obtain its Convex Auth user ID using the trusted Convex admin workflow, then run `npx convex env set OSINCT_ADMIN_USER_ID "USER_ID"` in the project folder. Do not use an ID supplied by an untrusted person.
- Entering `192008` into the Number Info query field requests maintenance mode. The code is verified on the Convex server; configure it with `npx convex env set OSINCT_MAINTENANCE_CODE "192008"`. This code only turns maintenance on. An authorized admin turns it off from the Admin panel. Keep the code private and change it if it is exposed.
- Convex stores authentication records and the maintenance settings only. Search inputs and API responses are held in page memory and are not written to Convex.
- The UI's maintenance switch is not an API security boundary. The API must enforce its own authentication, authorization, rate limits, and maintenance rules.

## Configure the API

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_LIVE_API_ENABLED=false
VITE_API_BASE_URL=https://your-authorized-api.example/
VITE_API_ROUTE=search
VITE_API_QUERY_PARAMETER=q
VITE_API_TIMEOUT_MS=8000
```

Only enable requests after reviewing an endpoint you own or are authorized to use, with non-sensitive test data. Then set `VITE_LIVE_API_ENABLED=true`. The request is a GET to the configured relative route with the input in the configured query parameter. The app expects JSON and displays the response without renaming fields or requiring `records`, `results`, `owner`, `region`, or timestamps.

**Do not configure this frontend to query private identity records or personal phone/Aadhaar lookup endpoints.** Use an authorized backend with a documented access policy and non-sensitive response data. This project does not verify the authorization or schema of any external service. No real lookup requests are made by the app by default.

All `VITE_*` variables are public browser configuration. Never put API keys, bearer tokens, Telegram bot tokens, or other secrets in them. If the API needs a secret, use a server-side proxy that keeps the secret server-side and enforces authentication and authorization.

## Checks

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```
