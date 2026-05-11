# AGENTORC-5 Follow-Up Scope Contract

Source of truth: ATLAS page `[AI 아키텍트] AGENTORC-5 후속 단계 4개 기능 범위 설계`

This repository records the allowed post-MVP expansion scope for AGENTORC-5 so later implementation issues can reuse one local contract.

## Included Follow-Up Features

1. Guardian management mode
2. Homework checklist
3. Cross-device sync
4. Server-backed notifications

## Still Out Of Scope

- External calendar import, export, or sync
- Social sharing, feeds, rankings, or community features
- Billing, subscriptions, receipt validation, or pricing plans
- Teacher, classroom, or multi-student organization workflows
- Admin-only operations consoles and external retry tooling

## Scope Rules

- Follow-up work must extend the existing personal learning app rather than turn it into a school operations or social product.
- New roadmap items must stay inside the four approved feature groups until requirements are explicitly reopened.
- Guardian, homework, sync, and notification work should be treated as one connected architecture, not four unrelated wish-list items.

## Recommended Delivery Order

1. Minimal account and permission backbone
2. Homework checklist
3. Sync core
4. Server-backed notifications
5. Guardian read dashboard and limited write controls
