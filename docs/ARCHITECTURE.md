# Architecture

This document describes the high-level architecture of ReachInbox.

## System Architecture

```mermaid
flowchart TD
  subgraph Client
    Web[React Dashboard]
  end

  subgraph API
    Auth[Google OAuth / Sessions]
    Sched[Scheduling API]
    SlackAPI[Slack OAuth]
    SearchAPI[Search API]
    BullBoard[Bull Board]
  end

  subgraph Worker
    BullWorker[BullMQ Worker]
    RateLimiter[Redis Lua rate limiter]
    Mailer[Nodemailer]
    SlackNotify[Slack notifier]
    Sweeps[Outbox / Index sweeps]
  end

  subgraph Data
    DB[(PostgreSQL)]
    Redis[(Redis)]
    ES[(Elasticsearch)]
  end

  Web --> API
  API --> DB
  API --> Redis
  API --> ES
  Worker --> Redis
  Worker --> DB
  Worker --> ES
```

## Request Flow Diagrams

```mermaid
sequenceDiagram
  participant C as Client
  participant A as API
  participant DB as Database
  participant R as Redis

  C->>A: Schedule Campaign
  A->>DB: Transaction (Save Campaign & Outbox Event)
  A->>R: Enqueue Job (best effort)
  A-->>C: Response
```

## Transactional Outbox Pattern

To prevent dropped messages when the API goes down right after DB commit but before Redis enqueue, we use an Outbox pattern:
1. Insert OutboxEvent in the same transaction.
2. API does best-effort enqueue.
3. Background Sweeper in Worker finds pending OutboxEvents and ensures they are in Redis.

## Rate Limiting Flow

```mermaid
stateDiagram-v2
  [*] --> CheckLimits
  CheckLimits --> Send : Allowed
  CheckLimits --> Reschedule : Quota/Rate Exceeded
  Send --> [*]
  Reschedule --> [*]
```

## Campaign Lifecycle State Machine

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> SCHEDULED
  SCHEDULED --> RUNNING
  RUNNING --> COMPLETED
  RUNNING --> PAUSED
  PAUSED --> RUNNING
  PAUSED --> CANCELLED
  RUNNING --> CANCELLED
```

## Email Job State Machine

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> QUEUED
  QUEUED --> RESERVED
  RESERVED --> SENT
  RESERVED --> RESCHEDULED
  RESCHEDULED --> QUEUED
  RESERVED --> FAILED
  QUEUED --> CANCELLED
```
