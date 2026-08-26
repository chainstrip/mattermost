# Local mattermost deploy (chainstrip)

Brings up a real mattermost server locally, serving **this checkout's built
webapp** (or the chainstrip cove2e workspace's build when `CS_COVE2E_WS` is in
the env). The server is the Go binary from the
`mattermostdevelopment/mattermost-enterprise-edition:master` image — the same
master this webapp tracks; unlicensed it runs as team edition.

```sh
# macOS (Apple Container, no Docker needed)
deploy/services.sh up|down|status

# Linux / Docker
docker compose -f deploy/compose.services.yml up -d --wait
```

- Server on http://localhost:8065 (ping: `/api/v4/system/ping`), postgres 14
  (the version mattermost's own e2e stack pins), env mirrored from
  `e2e-tests/.ci/server.generate.sh`.
- **No seeding needed**: the playwright suite's global setup creates the
  sysadmin + default team on a fresh server itself.
- DB is ephemeral (containers deleted on `down`) — e2e wants a clean slate.
- E2E: `cd ../e2e-tests/playwright && npm run test:smoke` (PW_BASE_URL
  defaults to http://localhost:8065).
