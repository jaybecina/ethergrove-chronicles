# 0005 — Vercel builds from the repo root

- **Status:** accepted · **Date:** 2026-10-25 · **Evidence:** `vercel.json`, Vercel build logs from 2026-10-25

## Context

Deploys failed with `No Output Directory named "dist" found`. The install lines in the Vercel log were
prefixed `../..`, which pnpm prints only when run from a subfolder, so the project's Root Directory was
set to `apps/web`, and Vercel ignored the root `vercel.json`.

## Decision

Keep a single `vercel.json` at the repo root (`pnpm --filter web build`, output `apps/web/dist`). The
Vercel project's Root Directory must be empty, with no build or output overrides.

## Consequences

- If a log shows `../..` on the install lines, the Root Directory setting has been changed back.
