# Catalog API Spec

## GET `/api/waters/search`

Query:

- `region` required. Accepted aliases: `id`, `bn`, `sg`, `my`, or full names.
- `q` optional search text.
- `mode` optional. `published` by default, `review` to include review-only rows in the main result set.
- `limit` optional, default `10`, max `25`.

Behavior:

- region-first ranking
- exact > prefix > partial > fuzzy
- published and brew-ready rows rank above manual-only and review queue rows
- verified > curated > review
- review queue rows appear only when published results are absent or weak, unless `mode=review`

Response:

```json
{
  "ok": true,
  "requestId": "uuid",
  "region": "Indonesia",
  "mode": "published",
  "items": [],
  "total": 0,
  "suggestions": [],
  "can_submit_suggestion": true,
  "can_request_ai_research": true
}
```

## GET `/api/drippers/search`

Same query contract and ranking rules as waters.

## GET `/api/grinders/search`

Same query contract and ranking rules as waters.

## GET `/api/waters/:id`

Returns a single published water record with sources, data quality, and derived coffee parameters.

## POST `/api/suggestions/brand`

Request body:

```json
{
  "kind": "water",
  "brand": "Volvic",
  "model": "",
  "region": "Singapore",
  "notes": "Seen in specialty retail"
}
```

Response:

```json
{
  "ok": true,
  "requestId": "uuid",
  "item": {
    "id": "uuid",
    "kind": "water",
    "brand": "Volvic",
    "region": "Singapore",
    "status": "queued",
    "durability": "file"
  }
}
```
