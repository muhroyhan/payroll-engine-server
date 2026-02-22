# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Commit message rules that drive version bumps

| Prefix | Bump | Examples |
|---|---|---|
| `feat!:` / `fix!:` / `breaking:` | **Major** | `feat!: redesign auth flow` |
| `feat:` | **Minor** | `feat: add payslip export endpoint` |
| `fix:` / `hotfix:` / `perf:` / `refactor:` | **Patch** | `fix: correct salary rounding` |
| `chore:` / `docs:` / `test:` / `ci:` / `style:` | **Patch** | `chore: update deps` |

---

## [0.1.4] - 2026-02-22

### Other Changes

- Merge pull request #16 from muhroyhan/develop
- revert
- fix error build
- fix render blueprint
- update render blueprint


## [0.1.3] - 2026-02-22

### Other Changes

- Merge pull request #15 from muhroyhan/develop
- revert build command


## [0.1.2] - 2026-02-22

### Other Changes

- Merge pull request #14 from muhroyhan/develop
- fix render deployment
- test deploy
- deployment test


## [0.1.1] - 2026-02-22

### Other Changes

- Merge pull request #13 from muhroyhan/develop
- missing DB_NAME


## [0.1.0] - 2026-02-22

### Features

- feat(ci): add semver versioning with auto CHANGELOG and package.json bump

### Bug Fixes

- fix(seed): replace TRUNCATE raw SQL with deleteMany to avoid statement timeout
- fix(ci): add prisma generate before seed + NODE_ENV=production
- fix: resolve Module not found by correcting CMD path to dist/src/main.js

### Other Changes

- Merge pull request #12 from muhroyhan/develop
- fix test
- Merge pull request #11 from muhroyhan/develop
- sync github secret to render env var
- deploy to render
- update web client topbar
- fix module standard
- module standard
- add common dto and service
- Merge pull request #10 from muhroyhan/develop
- Merge pull request #9 from muhroyhan/develop
- Merge pull request #8 from muhroyhan/develop
- update github permission
- Merge pull request #7 from muhroyhan/develop
- update docker build
- Merge pull request #6 from muhroyhan/develop
- fix run test
- dev to master (#5)
- Merge branch 'master' of https://github.com/muhroyhan/payroll-engine-server into develop
- update cicd
- dev to master (#4)
- cicd
- update docs, e2e test, and unit test
- cleaning
- docs
- docker fix
- clean docker and prisma code
- bugfix rate limiter
- Vibe cleaning (#3)
- Feature/login (#2)
- Modules (#1)
- solve eaddrinuse
- cleaning
- run hot reload bug
- update migration
- set docker + prisma
- initial commit


