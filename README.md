# Osinct search workspace

React + TypeScript + Vite. This project keeps the original HTML and project plan in the parent folder; the React app lives in `osinct-app`.

## Requirements

- Node.js 24 or newer (the test command uses Node's built-in TypeScript stripping and test runner).
- npm.

## Install and run

```powershell
npm install
npx convex dev
# In a second terminal:
npm run dev
```

Convex creates `.env.local` and sets `VITE_CONVEX_URL` for the selected deployment. Vite prints the local development URL. Searches run against fictional sample records in Convex; the browser does not call the legacy personal-data endpoint.

## Authentication and maintenance mode

- Email/password sign-up and sign-in use Convex Auth. Passwords must be at least 8 characters. Email verification and email-based password reset are not configured yet because no email delivery provider has been connected.
- All workspace and search operations require an authenticated session. Search queries are checked again on the Convex backend, so disabling the controls in the browser is not the security boundary.
- The owner controls maintenance mode from **Admin dashboard**. When enabled, Convex rejects all search requests and signed-in users see the configured red alert. The default message is `The website is currently under maintenance. Please wait for service to resume.`
- Admin access is bound to one specific Convex Auth user ID configured as a **server-side Convex environment variable**. This avoids granting admin access based on an unverified email address.

### Enable the first admin account

1. Start the app and create/sign in to the account that should own Osinct.
2. Open **Admin dashboard** and copy the account ID shown in the setup notice.
3. In the project folder, run this command with that exact ID:

   ```powershell
   npx convex env set OSINCT_ADMIN_USER_ID "PASTE_THE_ACCOUNT_ID_HERE"
   ```

4. Refresh the page. That account can now enable/disable maintenance and edit the alert message. Do not set this variable to an ID supplied by an untrusted user. Configure the variable separately on each deployment you use.

No admin account is enabled by default. Until `OSINCT_ADMIN_USER_ID` is configured, the dashboard intentionally denies maintenance changes.

## Commands

```powershell
npm test          # automated service, validation, URL, and failure-path tests
npm run typecheck # TypeScript project checks
npm run lint      # Oxlint
npm run build     # typecheck + production bundle
npm run preview   # serve the production bundle locally (after build)
```

## Search behavior

- **Phone number** and **Identity reference** are separate search modes.
- Input is validated before a request. Search history and identifiers are not written to local storage or analytics.
- Mock fixtures are synthetic (`202-555-0101` and `DEMO-ID-0001` are examples); they are not real records and must not be replaced with scraped/leaked personal data.
- Results are normalized against a strict schema and rendered by React as text, never injected as HTML.
- Errors have safe diagnostic codes; backend response bodies and search values are not logged.
- Requests support timeout, abort, retry, and duplicate-submission protection.

## API status and canonical proxy contract

**Live API integration is deliberately disabled by default and has not been verified against a real authorized backend.** The original HTML contains route strings and a `q` parameter, but it does not prove permission to access the target data, define a trustworthy response contract, or establish authentication/access controls. The original target appears intended to return personal identity/phone records, so this app must not connect to it unless authorization and safe access are independently established. No request to that service is made by this project.

The HTTP adapter is for a **trusted server-side proxy that you own or are authorized to use**. The proxy must:

1. Authenticate and authorize the user on the server; never rely on a frontend flag for access control.
2. Accept one configured relative route per mode and one configured query parameter.
3. Return JSON matching this canonical app contract (this is a contract for the proxy, not a claim about the legacy API):

```json
{
  "records": [
    {
      "id": "DEMO-2048",
      "title": "Northstar relay",
      "category": "Infrastructure",
      "status": "Verified",
      "updatedAt": "2026-10-20",
      "description": "Fictional sample record",
      "owner": "Demo team",
      "region": "North zone"
    }
  ]
}
```

`records` may be an empty array. Each field is required and must be a string; the app enforces field-size limits and a maximum of 100 records. The proxy should return appropriate HTTP status codes (`400` invalid request, `401/403` unauthenticated/unauthorized, `429` rate limit, `5xx` server failure), never expose stack traces/secrets in responses, and set correct CORS/HTTPS/security headers for the deployment.

### Configure a reviewed proxy

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SEARCH_ADAPTER=http`.
3. Set `VITE_API_BASE_URL` to the trusted proxy base URL.
4. Set `VITE_API_PHONE_ROUTE`, `VITE_API_IDENTITY_ROUTE`, and `VITE_API_QUERY_PARAMETER` to the values confirmed by that proxy's documentation/source.
5. Set `VITE_LIVE_API_ENABLED=true` only after authorization, authentication, rate limiting, schema, and sanitized fixture tests have been reviewed.
6. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`, then verify against non-sensitive test fixtures in a controlled environment.

Vite `VITE_*` variables are public browser configuration. **Never put API keys, bearer tokens, Telegram bot tokens, or other secrets in them.** If a backend requires a secret, keep it on the server and expose only a protected same-origin proxy. A production deployment should normally leave the browser calling that same-origin proxy rather than an arbitrary third-party API.

If the actual backend contract remains unknown, leave `VITE_SEARCH_ADAPTER=mock` and `VITE_LIVE_API_ENABLED=false`. Do not guess route names or response fields, and do not send real personal identifiers to test an undocumented service.
