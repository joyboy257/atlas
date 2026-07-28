# Lead Qualification Template

A governed lead qualification agent for B2B SaaS sales. Scores inbound leads
using BANT+Fit, enriches profiles, updates the CRM, and schedules meetings for
qualified leads.

## Quick Start

```bash
# Create a new project from this template
npx atlas init my-sales-agent --template lead-qualification

# Or copy manually
cp -r templates/lead-qualification my-sales-agent
cd my-sales-agent
npm install
npx atlas dev
```

## What's Included

- **Lead scoring** — BANT+Fit framework with configurable weights
- **Lead enrichment** — Company and contact data enrichment (stub)
- **CRM sync** — Create/update lead records (stub)
- **Meeting scheduling** — Calendar booking for MQL leads (stub)
- **Routing policy** — Enforces MQL threshold before meeting offers
- **Evals** — MQL flow and cold lead routing tests

## Customising

1. **Tune the scoring model** — Adjust BANT weights and thresholds in `agent/tools/score-lead.ts`
2. **Connect your data sources** — Replace `enrich-lead.ts` stub with Clearbit/Apollo/etc.
3. **Wire up your CRM** — Replace `update-crm.ts` stub with Salesforce/HubSpot/Pipedrive
4. **Add real scheduling** — Replace `schedule-meeting.ts` with Calendly/HubSpot Meetings
5. **Update ICP criteria** — Edit `knowledge/qualification-guide.md` with your ideal profile
6. **Add more evals** — Cover warm leads, edge cases, objection handling

## Structure

```
├── atlas.config.ts                 # Project configuration
├── agent/
│   ├── instructions.md             # Agent persona and qualification workflow
│   ├── tools/
│   │   ├── score-lead.ts           # BANT+Fit scoring
│   │   ├── enrich-lead.ts          # Data enrichment
│   │   ├── update-crm.ts           # CRM sync
│   │   └── schedule-meeting.ts     # Meeting booking
│   └── policies/
│       └── routing.policy.ts       # MQL threshold enforcement
├── channels/
│   └── web-chat.ts                 # Web chat channel
├── knowledge/
│   └── qualification-guide.md      # BANT+Fit framework and ICP
├── evals/
│   └── qualification-flows.eval.ts # MQL and cold lead tests
└── README.md
```

## Channel Readiness

| Channel | Status |
|---------|--------|
| Web Chat | LOCAL_CONFORMANCE — stub only |

## Next Steps

- Read the [Atlas Quickstart](https://github.com/joyboy257/atlas/blob/main/packages/atlas/docs/QUICKSTART.md)
- See the [Roadmap](https://github.com/joyboy257/atlas/blob/main/ROADMAP.md) for channel provider support
