# Operations

## Health Checks
- Liveness: `GET /api/health`
- Readiness: `GET /api/ready`

## Worker Heartbeat Monitoring
Workers update their status in Redis periodically.

## Queue Monitoring
Available via Bull Board mapped to `GET /admin/queues`.

## Log Management
Pino logger outputs structured JSON logs.

## Backup and Recovery
- Postgres: pg_dump daily.
- Redis: AOF enabled.
- Elasticsearch: Snapshots.

## Scaling Guidance
- API: Horizontally scale stateless nodes.
- Worker: Horizontally scale workers based on Queue depth.
- Database: Increase connection pool / vertical scaling.

## Troubleshooting
- Check worker logs for outbox sweeping issues.
- Monitor Redis memory eviction.
