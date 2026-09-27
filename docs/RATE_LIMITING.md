# Rate Limiting

## Redis Lua Script
ReachInbox uses an atomic Redis Lua script to check and consume rate limits. This prevents race conditions.

## Global Hourly Limits
Each sender account can only send `X` emails per hour to prevent being flagged as spam.

## Per-sender Hourly Limits
Specific limit variables are tied to the `Sender` model.

## Minimum Send Spacing
Between any two emails from the same sender, a minimum of `Y` seconds must elapse.

## Clock-hour Window Definition
Windows are strictly defined by the top of the hour.

## Deferral and Rescheduling Behavior
If a limit is hit, the worker reschedules the BullMQ job for the next available slot or next hour.

## Rate Limit Reservation and Crash Recovery
Reservations are atomic. If a worker crashes post-reservation, the job might be retried, but the reservation window expires naturally.

## Configuration
Controlled via Redis keys and environment variables.
