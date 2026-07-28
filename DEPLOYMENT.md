# Abse deployment checklist

## Public build variables

Configure these in the Base44 production environment:

```env
VITE_BASE44_APP_ID=6a65ec0044e35fe96bbb8013
```

These identifiers are public frontend configuration. Do not place the GitHub Client Secret, access tokens, or other credentials in any `VITE_*` variable.

## Base44 application setting

The root landing page must be publicly accessible while logged out:

```text
https://abse.base44.app/
```

The app should initiate Base44 authentication only after the visitor clicks **Sign in to Abse**. Backend entities and functions must remain protected.

## GitHub OAuth App

Keep the GitHub Client ID and Client Secret inside the Base44 app-user connector configuration.

Confirm the callback URL shown by Base44 matches the live Abse domain. The expected pattern is:

```text
https://abse.base44.app/api/external-auth/callback
```

Use the exact callback value displayed by Base44 if it differs.

## Required flow

1. Open the public landing page.
2. Click **Sign in to Abse**.
3. Complete Base44 app authentication.
4. Return to `/github-link`.
5. Click **Connect personal GitHub**.
6. Complete GitHub authorization.
7. Return to Abse and sync history.

## Verification

Run locally before deployment:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

After deployment, test in a private/incognito browser window so an existing session does not hide authentication problems.
