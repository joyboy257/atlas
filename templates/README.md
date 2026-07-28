# Atlas Templates

Ready-to-use starter templates for common business messaging agents. Each template is a self-contained Atlas project — copy it, customise it, and run it.

## Available Templates

| Template | Use Case | Channels | Difficulty |
|----------|----------|----------|------------|
| [Front Desk](./front-desk/) | Hotel/hospitality — booking, rescheduling, FAQs | Web Chat | Beginner |
| [Customer Support](./customer-support/) | SaaS support — KB search, tickets, handoff | Web Chat, Email | Intermediate |
| [Lead Qualification](./lead-qualification/) | B2B sales — scoring, enrichment, CRM, meetings | Web Chat | Intermediate |

## Using a Template

```bash
# Via the Atlas CLI (coming soon)
npx atlas init my-agent --template front-desk

# Manual setup
cp -r templates/front-desk my-agent
cd my-agent
npm install @atlas-runner/atlas
npx atlas dev
```

## Template Structure

Every template follows the same project structure:

```
template-name/
├── atlas.config.ts          # Project configuration
├── agent/
│   ├── instructions.md      # Agent persona and behaviour
│   ├── tools/               # Tool implementations (stubs)
│   └── policies/            # Business rule enforcement
├── channels/                # Channel adapters (stubs, LOCAL_CONFORMANCE)
├── knowledge/               # Domain knowledge (markdown)
├── evals/                   # Conversation-level tests
└── README.md                # Template-specific guide
```

## Customising a Template

1. **Persona** — Edit `agent/instructions.md` with your brand voice and workflows
2. **Tools** — Replace stub implementations with your actual APIs and databases
3. **Policies** — Add business rules specific to your domain
4. **Knowledge** — Replace placeholder docs with your real content
5. **Channels** — Swap LOCAL_CONFORMANCE stubs for real providers (when ready)
6. **Evals** — Add scenarios covering your critical business flows

## Channel Readiness

All templates ship with `LOCAL_CONFORMANCE` channel stubs. These work locally for development and testing. For production use, replace them with live channel providers.

See [Channel Readiness](../packages/atlas/docs/CHANNEL-READINESS.md) for provider status.

## Contributing

Have a template idea? See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on adding new templates.
