# Changelog

All notable changes to the Atlas developer kit will be documented in this file.

## [0.1.0-alpha.0] — Unreleased

### Added
- Initial public alpha release
- One-command project initialization (`atlas init front-desk`)
- Zero-credential local runtime with agent loop
- Business messaging simulator (16 channels)
- Developer workbench (browser-based UI)
- BYOK and custom gateway inference modes
- Runtime protocol with 4 adapter implementations (Atlas-native, OpenAI, Eve, webhook)
- Channel fabric with 16 channel adapters
- Version-matched documentation and agent skills
- Project contract (`atlas.config.ts`) with versioned JSON Schema
- Scaffold generator with safe adoption (empty folder, existing project, npm/pnpm)
- CLI command suite (init, dev, test, doctor, capabilities, explain, inspect, replay, deploy, upgrade)
- Operation journal with resumable state
- Deployment configuration with idempotency and validation
- Receipt integrity verification
- MCP configuration and management
- File-system safety utilities

### Known Limitations
- All 16 channels are `LOCAL_CONFORMANCE` only — zero provider-connected or live-provider-proven channels
- No hosted deployment, staging, or production environment
- No managed inference (local fixture mode only)
- No billing, usage tracking, or commercial features
- Single coding-agent client tested (OpenCode)
- No human adoption testing completed
- Package extraction (project-spec, sdk, etc.) is in progress
