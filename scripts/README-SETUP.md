# Multi-User Categorisation System — Setup Guide

## 1. Run D1 Database Migration
Execute migration `003_categorisation.sql` against your Cloudflare D1 database:

```bash
# Local development testing
npx wrangler d1 execute meme-capsule-db --local --file=d1/migrations/003_categorisation.sql

# Production Cloudflare D1
npx wrangler d1 execute meme-capsule-db --remote --file=d1/migrations/003_categorisation.sql
```

## 2. Seed / Update Judge Credentials
Run the setup generator script to generate password hashes and SQL statements:

```bash
npx tsx scripts/setup-cat-users.ts
```

### Default Accounts Initialized:
| Username | Role | Default Password | Initial Display Name |
| :--- | :--- | :--- | :--- |
| `superadmin` | `superadmin` | `changeme123` | Super Admin |
| `judge1` | `judge` | `changeme123` | Judge One |
| `judge2` | `judge` | `changeme123` | Judge Two |
| `judge3` | `judge` | `changeme123` | Judge Three |

## 3. Accessing the Judge Portal
- **URL**: `/#/categorise` (or click "Judge Portal" link in footer)
- **Judges**: Log in to access the fast keyboard-driven categorization interface (Keys `1-7`, `Space`, `Arrows`, `Z`).
- **Superadmin**: Log in to view real-time judge progress, consensus resolution, and disagreement queues.
