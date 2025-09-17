# Repository Guidelines

This guide helps contributors ship safe, focused changes quickly for the Blakely Cinematics website and supporting Lambdas.

## Project Structure & Module Organization
- Entry points: `index.html`, `admin.html`, `vip/*.html`, `public/pages/*.html`
- Frontend: `js/` (client scripts), `css/` (styles), `assets/` (icons/images)
- Admin app: `modules/admin/` (controllers, models, services, views, components, composers)
- Backend: `backend/` (Node 18+ Lambdas in `backend/lambda/*`, helpers in `backend/utils/`, tests in `backend/test-*.js`)
- Legacy/experiments: `vip-handler-lambda/`
- Generated or historical: `dist/`, `audits/`, `archive/` (do not edit manually)
- Docs: `docs/`

## Build, Test, and Development Commands
- Frontend (static): no build step. Serve locally, e.g. `python3 -m http.server 8000` then open `http://localhost:8000`.
- Backend tests:
  - `cd backend && npm install`
  - `npm test` runs `verify-all-systems.js`
  - Focused checks: `node test-gallery-crud.js`, `node test-asset-manager.js`
- Deployment helpers (AWS CLI required): packaging and `deploy:*` scripts live in `backend/package.json`.

## Coding Style & Naming Conventions
- JavaScript: 4-space indentation; end statements with semicolons.
- Quotes: prefer single quotes in `backend/` and `modules/`; follow existing file style in `js/`.
- Filenames: utilities kebab-case (e.g., `vip-dashboard.js`); components/classes PascalCase (e.g., `ComposeModal.js`); Lambda entrypoints `index.js`.
- Do not modify code in `dist/`, `audits/`, or `archive/` except when regenerating via scripts.

## Testing Guidelines
- Keep tests Node-runnable (no frameworks required). Name as `test-*.js` alongside backend.
- Cover auth paths and happy-path CRUD for galleries/assets.
- Tests must be idempotent and safe against production resources.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; prefer Conventional Commits (`feat:`, `fix:`, `chore:`).
- PRs: clear description, linked issues, validation steps, and screenshots/GIFs for UI changes. Include risk/rollback notes for backend.

## Security & Configuration Tips
- Never commit secrets. Configure `JWT_SECRET` and `REFRESH_SECRET` in Lambda/CI.
- Use AWS profiles or tools like `aws-vault`; avoid embedding ARNs/keys in source.
- Sanitize logs and avoid dumping payloads with PII.

