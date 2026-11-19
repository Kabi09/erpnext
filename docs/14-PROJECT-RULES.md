# CRYO ERP project rules

## Change workflow

1. Read root AGENTS.md, then project.md. Create project.md before changing the codebase if it is absent.
2. Read relevant docs, metadata and existing files. Check compatibility with documented decisions. Reuse current architecture, shared utilities and components, and make the smallest clean change that satisfies the requirement.
3. Implement incrementally, verify applicable behavior, then update project.md and affected technical docs. Check that the documentation reflects the application and that the handover is usable without chat history.
4. Preserve existing reference repositories. Use direct source reading and repeatable indexing when inputs change. Do not install or run ERPNext or Frappe for this work. Follow applicable open-source licenses and preserve provenance and notices.

Keep project.md as the single record of current changes, architecture, decisions, testing, open work and handover. Record UI, components, feature behavior, flows, routing, state, endpoints, schema, security, dependencies, configuration and file layout changes. Preserve history and explain changed decisions. For changed logic record previous behavior, new behavior, reason, affected files, dependencies, side effects and verification. For architecture changes update structure, application logic, database, APIs, decisions and history. Never store secrets. Mark work completed only after verification. Coordinate separate files or branches and shared contracts if agents are working in parallel.

## Approved stack and UI

Use React, Vite, MUI, React Router, Axios or shared API utilities, SCSS and SCSS Modules, and the project's Google Font. Use Google Material Icons through MUI or the equivalent Google set. Use Node.js, Express, JWT, MongoDB and Mongoose with replica-set transactions. Keep this stack unless the user approves a change. Python and MariaDB are reference technologies. Avoid Tailwind, Bootstrap, alternate UI or icon libraries, inline styles for routine work, styled-components and custom CSS-in-JS. Use SCSS Modules for custom component styling and MUI internal styling dependencies for MUI itself.

Use a named component folder with a JSX file and a named SCSS Module where custom styling is needed. Import `styles` from `./ComponentName.module.scss`. Use shared tokens for color, typography, spacing, radius, breakpoints, shadows and layout. Adopt .container and .wrapper with .toprow, .middlerow and .bottomrow and their left, center and right regions where the component benefits from those regions. Keep empty wrappers out. Prefer native MUI components and reuse form, table, dialog and layout primitives.

Support six viewport classes from small mobile to large desktop, multiple orientations and long values. Use flow layouts, wrapping, bounds and container-local table scrolling. Prevent page overflow, overlaps, clipping and unexpected fixed/sticky collisions. Preserve image aspect ratio and size. Ensure readable long labels and accessible icon names, tooltips, focus and states.

## Application and data

Handle props, state, events, validation, loading, success, failure, empty results, auth, navigation, document lifecycles and workflow status. Centralize API handling and consistent pagination, sorting, filtering and status codes. Verify requests, type registration, allowed fields and record permissions on the server. Keep secrets in environment or a secret store. Keep financial values fixed precision. Separate domain logic from controllers and views.

Use atomic, idempotent operations for ledger posting, stock and financial transactions. Prevent duplicate submission and postings, negative inventory where prohibited and excess issuance. Track requested, issued and remaining amounts, related status rollups and transaction history. Validate workflow transitions and protect audit logs. Support realistic workloads for about 500 registered users and measure concurrency and performance. Remove unnecessary dependencies and duplication. Keep generated coverage and production-ready functionality clearly identified.

## Verification and handover

Exercise small mobile, mobile, tablet, laptop, desktop and large desktop. Check overlaps, overflow, clipping, alignment, images and text, menus and dialogs. Exercise controls, forms, navigation, loading, errors, empty states, APIs, permissions, workflows and existing behavior. Check console, React and backend errors, imports, build and relevant automated tests. Record executed checks and exact results. Mark unavailable or unexecuted checks pending.

Before completion, verify that AGENTS.md and project.md were read, conventions followed, requested work delivered and relevant behavior tested. Update project.md with actual changes, decisions, progress, limitations, results and an exact next implementation task. Ensure the handover points to required docs, metadata, commands and known blockers.
