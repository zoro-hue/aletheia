# Aletheia MCP Server

Model Context Protocol (MCP) server for Aletheia, enabling AI assistants to interact with Aletheia programmatically.

A complete list of tools can be seen under [mcp.reference.aletheia.com](https://mcp.reference.aletheia.com).

> ⚠️ **API stability**:
> This MCP server is self-describing. Clients should dynamically inspect available tools and schemas rather than assuming a static interface.
> Tool availability and schemas may evolve over time, including the addition, removal, or modification of tools and fields. Clients are expected to tolerate schema changes and refresh capabilities dynamically.

## Quick Start (Local Development)

### Prerequisites

- Aletheia instance running locally
- Project-scoped API key (Public Key + Secret Key)
- Claude Code or another MCP-compatible client

### Steps

1. **Get API Keys**
   - Navigate to `http://localhost:3000/project/{project-id}/settings`
   - Create or copy a project-scoped API key (`pk-lf-...` and `sk-lf-...`)
   - Note: Organization-level keys are not supported

2. **Encode Credentials**

   ```bash
   echo -n "pk-lf-xxx:sk-lf-xxx" | base64
   ```

   Output:

   ```
   // Example. Real token will be much longer
   cGstbGYteHh4OnNrLWxmLXh4eA==
   ```

3. **Add to Claude Code**

   ```bash
   claude mcp add --transport http aletheia http://localhost:3000/api/public/mcp \
       --header "Authorization: Basic {your-base64-token}"
   ```

4. **Verify prompt access**
   In Claude Code: `List all prompts in the project`

5. **Verify observation access**
   In Claude Code: `List recent Aletheia observations`

## Architecture

### Stateless Design

The Aletheia MCP server uses a **stateless per-request architecture**:

1. **Fresh server instance per request:** Each MCP request creates a new server instance
2. **Context captured in closures:** Authentication context is captured in handler closures
3. **No session storage:** Server is discarded after request completes
4. **No state between requests:** Each request is independent

This design:

- Eliminates session management complexity
- Prevents state leaks between projects
- Simplifies authentication (project context derived from API key)

### Authentication Flow

```
1. Client sends request with Authorization header
   ↓
2. API endpoint validates BasicAuth (PUBLIC_KEY:SECRET_KEY)
   ↓
3. Verify API key has project-level scope
   ↓
4. Build ServerContext from API key metadata
   ↓
5. Create fresh MCP server with context in closure
   ↓
6. Handle request (context auto-injected to handlers)
   ↓
7. Discard server instance
```

**ServerContext:**

```typescript
{
  projectId: "proj-123",      // Auto-injected from API key
  orgId: "org-456",           // Auto-injected from API key
  apiKeyId: "key-789",        // For audit logging
  accessLevel: "project",     // Required for MCP
  publicKey: "pk-lf-..."      // For reference
}
```

### Tool Annotations

Tools include hints for clients about their behavior:

- **`readOnlyHint: true`**: Safe operations that don't modify data
- **`destructiveHint: true`**: Operations that modify data in ways that are non-revertable. If an operation only creates entities, without updating existing, it can omit this.

Clients like Claude Code can use these annotations to:

- Auto-approve read-only operations
- Require user confirmation for destructive operations

### Audit Logging

All write operations should audit-log entries with before/after snapshots.

---

# Connecting Clients

## Authentication

All clients require BasicAuth authentication using your Aletheia API keys.

### 1. Generate Basic Auth Token

Encode your Aletheia API keys (Public Key:Secret Key) to base64:

```bash
echo -n "pk-lf-your-public-key:sk-lf-your-secret-key" | base64
```

This outputs your BasicAuth token (e.g., `cGstbGYt...`).

### 2. Choose Your Aletheia URL

**Aletheia Cloud:**

- **EU Region:** `https://cloud.aletheia.com`
- **US Region:** `https://us.aletheia.com`
- **HIPAA:** `https://hipaa.aletheia.com`

**Self-Hosted:**

- Use your domain with HTTPS: `https://your-domain.com`
- If a reverse proxy forwards a different `Host` header than `NEXTAUTH_URL`,
  either preserve the public host at the proxy or set
  `ALETHEIA_MCP_ALLOWED_HOSTS` to a comma-separated list of exact additional
  hostnames/origins accepted by the MCP endpoint. Wildcards and paths are not
  supported.

**Local Development:**

- `http://localhost:3000`

---

## Claude Code

Register the Aletheia MCP server:

```bash
# Aletheia Cloud (EU)
claude mcp add --transport http aletheia https://cloud.aletheia.com/api/public/mcp \
    --header "Authorization: Basic {your-base64-token}"

# Aletheia Cloud (US)
claude mcp add --transport http aletheia https://us.aletheia.com/api/public/mcp \
    --header "Authorization: Basic {your-base64-token}"

# Self-Hosted (HTTPS required)
claude mcp add --transport http aletheia https://your-domain.com/api/public/mcp \
    --header "Authorization: Basic {your-base64-token}"

# Local Development
claude mcp add --transport http aletheia http://localhost:3000/api/public/mcp \
    --header "Authorization: Basic {your-base64-token}"
```

---

## Cursor

Add to your Cursor MCP settings:

```json
{
  "mcp": {
    "servers": {
      "aletheia": {
        "url": "https://cloud.aletheia.com/api/public/mcp",
        "headers": {
          "Authorization": "Basic {your-base64-token}"
        }
      }
    }
  }
}
```

Replace `https://cloud.aletheia.com` with your Aletheia URL (see [Choose Your Aletheia URL](#2-choose-your-aletheia-url)).
