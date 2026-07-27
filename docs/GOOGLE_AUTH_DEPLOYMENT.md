# Google authentication deployment check

Abse now starts Base44's built-in Google authentication directly from the landing CTA.

## Base44 dashboard

Under **Settings → Authentication**:

- Enable **Google authentication**.
- Select **Use the default Base44 OAuth**.
- Email/password may remain enabled as a fallback.
- Publish the app after saving the authentication settings.

The default Base44 Google OAuth does not require custom Google credentials or the Builder plan.

## Frontend build variable

The production build must contain:

```env
VITE_BASE44_APP_ID=6a65ec0044e35fe96bbb8013
```

Because this is a Vite build-time variable, redeploy after setting it.

## Live test

1. Open `https://abse.base44.app/` in an incognito window.
2. Click **Sign in to Abse**.
3. Confirm Google authentication opens.
4. Complete authentication.
5. Confirm the browser returns to `/github-link`.
6. Enter a public GitHub username and continue.

A `User/me` 401 before login is expected. After successful login, `User/me` must return 200.
