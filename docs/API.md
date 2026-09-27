# API Endpoints

## Auth
- **GET /api/auth/google**: Redirect to Google OAuth. (Auth: none)
- **GET /api/auth/google/callback**: Google OAuth callback. (Auth: none)
- **GET /api/auth/me**: Get current user. (Auth: required)
- **POST /api/auth/logout**: Logout user. (Auth: required)

## Campaigns
- **GET /api/campaigns**: List campaigns. (Auth: required)
- **GET /api/campaigns/:id**: Get campaign details. (Auth: required)
- **GET /api/campaigns/:id/events**: Get campaign events. (Auth: required)
- **POST /api/campaigns/:id/cancel**: Cancel a campaign. (Auth: required)

## Emails
- **POST /api/emails/schedule**: Schedule new emails. (Auth: required, Body: `{ ... }`)
- **GET /api/emails/scheduled**: List scheduled emails. (Auth: required)
- **GET /api/emails/sent**: List sent emails. (Auth: required)
- **GET /api/emails/:id**: Get specific email job. (Auth: required)
- **POST /api/emails/:id/cancel**: Cancel email job. (Auth: required)
- **POST /api/emails/:id/retry**: Retry failed email. (Auth: required)
- **POST /api/emails/:id/reschedule**: Reschedule email. (Auth: required, Body: `{ sendAt }`)

## Senders
- **GET /api/senders**: List senders. (Auth: required)
- **POST /api/senders**: Add sender. (Auth: required)

## Slack
- **GET /api/slack/oauth/authorize**: Start Slack integration. (Auth: required)
- **GET /api/slack/oauth/callback**: Slack callback. (Auth: required)
- **GET /api/slack/status**: Slack connection status. (Auth: required)
- **GET /api/slack/channels**: List Slack channels. (Auth: required)
- **POST /api/slack/channel**: Select channel. (Auth: required)
- **POST /api/slack/disconnect**: Disconnect Slack. (Auth: required)

## Search
- **GET /api/search/emails**: Search indexed emails. (Auth: required, Query: `q`)
- **POST /api/search/reindex**: Force reindex. (Auth: required)

## Health
- **GET /api/health**: Check liveness.
- **GET /api/ready**: Check readiness.

## Stats
- **GET /api/stats/dashboard**: Dashboard stats. (Auth: required)

## Queue Health
- **GET /api/queue-health**: BullMQ stats. (Auth: required)
