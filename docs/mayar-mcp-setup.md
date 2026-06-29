# Mayar MCP Setup

Official source: https://dev.mayar.id/ and https://docs.mayar.id/integration/MCP.md

Mayar documents an MCP server at:

```json
{
  "mcpServers": {
    "mayar": {
      "url": "https://mcp.mayar.id/",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer ${MAYAR_API_KEY}"
      }
    }
  }
}
```

Do not commit a real `MAYAR_API_KEY` into this repo.

Local operator setup:

1. Create a Mayar API key in the Mayar dashboard.
2. Store it in your local/user MCP client secret store as `MAYAR_API_KEY`.
3. Configure the MCP server outside the repo if your client supports user-level MCP config.
4. Test with the Mayar MCP tool list before using it to create invoices or inspect transactions.

Repo policy:

- No committed MCP config containing secrets.
- No Mayar MCP action is required for normal app runtime.
- Runtime app integration uses REST endpoints from official Mayar API docs.
