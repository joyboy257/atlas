# Contributing to Atlas

Thanks for your interest in Atlas! This guide covers how to set up, develop, and contribute.

## Code of Conduct

Be respectful. Be constructive. Build in public.

## Development Setup

### Prerequisites
- **Node.js >= 22.0.0**
- **npm >= 10** (or pnpm)

### Getting Started

```bash
git clone https://github.com/joyboy257/atlas.git
cd atlas
npm install
npm run build
npm test
```

### Project Structure

```
atlas/
├── packages/
│   ├── atlas/              # Main package (CLI, runtime, simulator, workbench)
│   ├── project-spec/       # Project schema and contract types (extracting)
│   ├── sdk/                # Pure types and runtime interfaces (extracting)
│   ├── cli/                # CLI command suite (planned)
│   ├── local-runtime/      # Agent loop and simulator (planned)
│   ├── channel-sdk/        # Channel fabric and adapters (planned)
│   ├── runtime-adapters/   # Protocol and adapter bridges (planned)
│   └── testkit/            # Conformance suites (planned)
├── examples/               # Runnable example agents
├── templates/              # Starter templates
└── docs/                   # Public documentation
```

Currently the main `@atlas-runner/atlas` package contains the full implementation. Other packages are being progressively extracted.

### Running Tests

```bash
# All tests
npm test

# Specific package
cd packages/atlas && npm test

# Watch mode
cd packages/atlas && npx vitest
```

### Building

```bash
npm run build          # All packages
cd packages/atlas && npm run build   # Just the main package
```

## Package Extraction

We are progressively splitting the monolithic `@atlas-runner/atlas` package into focused packages. The extraction order is dependency-driven:

1. **project-spec** — Zero internal dependencies. Schema, contract types, validation.
2. **sdk** — Pure types and interfaces. Depends on project-spec.
3. **testkit** — Conformance fixtures. Depends on sdk.
4. **channel-sdk** — Channel fabric. Depends on sdk.
5. **runtime-adapters** — Protocol and bridges. Depends on sdk.
6. **local-runtime** — Agent loop and simulator. Depends on channel-sdk + runtime-adapters.
7. **cli** — Command suite. Depends on everything above.

When extracting:
1. Move source files to the target package
2. Update imports in both source and consumers
3. Ensure all tests pass
4. Update the package's README with extraction status
5. Update the ROADMAP.md extraction table

## Commit Conventions

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `test:` — Tests
- `refactor:` — Code restructuring (no behavior change)
- `extract:` — Package extraction (moving files between packages)
- `chore:` — Maintenance

## Pull Requests

1. Keep PRs focused — one concern per PR
2. Include test coverage for new code
3. Update documentation if behavior changes
4. Ensure `npm test` passes
5. For extraction PRs, verify both the extracted and source packages

## Licence

All contributions are under Apache-2.0. See [LICENSE](LICENSE).
