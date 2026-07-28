# Customer Support Template

A governed customer support agent for SaaS companies. Searches the knowledge
base, creates tickets, and hands off to humans when needed.

## Quick Start

```bash
# Create a new project from this template
npx atlas init my-support-agent --template customer-support

# Or copy manually
cp -r templates/customer-support my-support-agent
cd my-support-agent
npm install
npx atlas dev
```

## What's Included

- **Web chat + email channels** — Multi-channel support ready to connect
- **Knowledge base search** — Find answers in your help centre
- **Ticket creation** — Open and track support tickets
- **Human handoff** — Escalate to a human agent with conversation summary
- **Handoff policy** — Ensures KB is checked before escalating
- **Evals** — KB resolution and handoff escalation tests

## Customising

1. **Add your help content** — Replace `knowledge/help-center.md` with your actual help articles
2. **Connect your ticketing system** — Replace `create-ticket.ts` stub with Zendesk/Linear/etc.
3. **Set up your handoff queue** — Replace `handoff-to-human.ts` with your real routing
4. **Add your brand voice** — Edit `agent/instructions.md`
5. **Write more evals** — Cover your most common support scenarios

## Structure

```
├── atlas.config.ts               # Project configuration
├── agent/
│   ├── instructions.md           # Agent persona and support workflow
│   ├── tools/
│   │   ├── search-knowledge-base.ts
│   │   ├── create-ticket.ts
│   │   └── handoff-to-human.ts
│   └── policies/
│       └── handoff-approval.policy.ts
├── channels/
│   ├── web-chat.ts               # Live chat channel
│   └── email.ts                  # Email support channel
├── knowledge/
│   └── help-center.md            # Knowledge base content
├── evals/
│   └── support-flows.eval.ts
└── README.md
```

## Channel Readiness

| Channel | Status |
|---------|--------|
| Web Chat | LOCAL_CONFORMANCE — stub only |
| Email | LOCAL_CONFORMANCE — stub only |

## Next Steps

- Read the [Atlas Quickstart](https://github.com/joyboy257/atlas/blob/main/packages/atlas/docs/QUICKSTART.md)
- Explore the [Agent Guide](https://github.com/joyboy257/atlas/blob/main/packages/atlas/docs/AGENT-GUIDE.md)
