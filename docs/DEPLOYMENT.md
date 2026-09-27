# Deployment

## Production Requirements
- PostgreSQL 15+
- Redis 7+
- Elasticsearch 8+
- Node.js 20+

## Docker Deployment
Using `docker-compose.yml` in root directory.
`docker-compose up -d --build`

## Environment Configuration
See `.env.example`

## Database Migrations
Run `npm run db:migrate:deploy` before deploying new app versions.

## SSL/TLS Setup
Use Caddy or Nginx reverse proxy to terminate SSL.

## Reverse Proxy Configuration
Ensure `X-Forwarded-For` is trusted for rate limiting.

## Monitoring
Integrate Datadog or Prometheus via exposed metric endpoints.
