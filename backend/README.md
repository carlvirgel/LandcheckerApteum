# Backend: Rails API

See the [project README](../README.md) for setup, the API reference and design notes.

```bash
docker compose exec api bin/rails console
docker compose exec -e RAILS_ENV=test api bundle exec rspec
docker compose exec api bin/rails demo:market   # simulate price/status changes
SEED_PROPERTIES=50000 docker compose exec api bin/rails db:seed:replant
```
