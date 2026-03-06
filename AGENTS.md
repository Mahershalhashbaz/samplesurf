# AGENTS.md

## Purpose
This file defines safety and workflow rules for AI agents working in the SampleSurf repository.

## Hard Safety Rules
- Never commit `.env` files.
- Never commit SQLite database files, including `prisma/*.db`.
- Do not modify launchctl app-mode server configuration unless explicitly instructed by the user.

## Product Behavior Requirements
- Maintain compatibility with the mobile PWA install experience.
- Preserve the scanner OCR flow and Amazon lookup behavior.
- Ensure newly created items default to `videoDone=false`.
- Maintain compatibility with Video Tracker metrics and related reporting behavior.

## Change Management Expectations
- Prefer small, safe commits.
- Avoid large refactors unless explicitly requested.
- Always run builds before committing changes.

## Implementation Guidance
- Favor targeted changes over broad rewrites.
- If a requested change may affect scanner, Amazon lookup, PWA installability, or Video Tracker behavior, call out the risk and validate carefully.
- If a change conflicts with the rules above, pause and ask for explicit user confirmation before proceeding.
