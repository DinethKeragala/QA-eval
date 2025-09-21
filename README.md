# QA Eval MERN + Selenium

This repo contains a minimal MERN stack app and two Selenium end-to-end tests.

Scenarios automated:
- Login with valid credentials navigates to dashboard
- Add a new item after login and verify it appears

## Prerequisites
- Node.js 18+
- Google Chrome installed (for chromedriver)

## Install

```cmd
npm install
```

This installs root dev tools as well as `server`, `client`, and `tests` workspace deps.

## Run the app locally

```cmd
npm run start
```

This starts:
- API server on http://localhost:4000
- React client on http://localhost:5173

Default credentials: `test` / `password`.

## Run tests

The test script will boot the app (if not already) and then run Selenium tests.

```cmd
npm test
```

## Notes
- The backend uses an in-memory store for demo purposes. No MongoDB required.
- Tests use `selenium-webdriver` with Chrome.
- If Chrome auto-updates and chromedriver becomes incompatible, reinstall deps in `tests` workspace or set `CHROMEDRIVER_VERSION` accordingly.