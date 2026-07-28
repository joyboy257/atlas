# Atlas package documentation

Start with [QUICKSTART.md](./QUICKSTART.md).

Atlas is the Business Messaging Agent Runtime. This package contains the CLI, project schema, zero-credential local runtime, messaging simulator, developer workbench, runtime-neutral turn protocol, Atlas-native and external-runtime adapters, managed/BYOK/gateway model routing, shared channel fabric, sixteen local-conformance channel profiles, examples, repair guidance, and coding-agent skills required to build and verify a governed business messaging agent without private Mirai knowledge.

## Source of truth

- Project shape: [PROJECT-CONTRACT.md](./PROJECT-CONTRACT.md)
- Commands: [COMMANDS.md](./COMMANDS.md)
- Authority boundary: [AUTHORITY.md](./AUTHORITY.md)
- Coding agents: [AGENT-GUIDE.md](./AGENT-GUIDE.md)
- Errors and recovery: [ERROR-CATALOG.md](./ERROR-CATALOG.md) and [REPAIR.md](./REPAIR.md)
- Schema migration: [MIGRATION.md](./MIGRATION.md)
- Turn protocol: [RUNTIME-PROTOCOL.md](./RUNTIME-PROTOCOL.md)
- Runtime adapters: [RUNTIME-ADAPTERS.md](./RUNTIME-ADAPTERS.md)
- Managed/BYOK/gateway inference: [MODEL-ROUTING.md](./MODEL-ROUTING.md)
- Shared channel fabric: [CHANNEL-FABRIC.md](./CHANNEL-FABRIC.md)
- Sixteen-channel readiness: [CHANNEL-READINESS.md](./CHANNEL-READINESS.md)
- Integrated P2 proof: [P2-CERTIFICATION.md](./P2-CERTIFICATION.md)
- Machine-readable index: [public-docs.manifest.json](./public-docs.manifest.json)

These documents match `@mirai/atlas@0.1.0-preview.0`. Run `atlas capabilities --json` and `atlas explain project --json` for installed-code truth.
