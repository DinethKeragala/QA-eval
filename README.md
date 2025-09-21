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

### Configure MongoDB

The API now persists data in MongoDB using Mongoose.

1) Ensure MongoDB is running locally or provide a connection string.
2) Copy `server/.env.example` to `server/.env` and adjust values if needed.

If no `.env` is provided, the server will default to `mongodb://127.0.0.1:27017/qa_eval` and seed the default user on startup.

## Run tests

The test script will boot the app (if not already) and then run Selenium tests.

```cmd
npm test
```

## Notes
- The backend persists users and items in MongoDB. Sessions remain in-memory (simple demo token store). Restarting the server will keep data but invalidate login tokens.
- Tests use `selenium-webdriver` with Chrome.
- If Chrome auto-updates and chromedriver becomes incompatible, reinstall deps in `tests` workspace or set `CHROMEDRIVER_VERSION` accordingly.