# Front Desk Template

A governed front desk agent for hotels and hospitality. Handles booking,
rescheduling, cancellations, and FAQs through a web chat channel.

## Quick Start

```bash
# Create a new project from this template
npx atlas init my-front-desk --template front-desk

# Or copy manually
cp -r templates/front-desk my-front-desk
cd my-front-desk
npm install
npx atlas dev
```

## What's Included

- **Web chat channel** — Ready for embedding in your website
- **Booking tools** — Check availability, book, reschedule, cancel
- **Business policies** — Cancellation fee enforcement, occupancy limits
- **Knowledge base** — Amenities, FAQs, pet policy, check-in/out times
- **Evals** — Reschedule flow test

## Customising

1. **Update the knowledge base** — Replace `knowledge/booking-policy.md` with your hotel's actual policies
2. **Connect your booking system** — Replace stub implementations in `agent/tools/*.ts`
3. **Add your brand voice** — Edit `agent/instructions.md` with your tone and style guide
4. **Add a real channel** — Replace the web-chat stub with a live provider when ready
5. **Write more evals** — Add eval scenarios for cancellation, FAQ, edge cases

## Structure

```
├── atlas.config.ts          # Project configuration
├── agent/
│   ├── instructions.md      # Agent persona and behaviour
│   ├── tools/               # Tool implementations
│   │   ├── check-availability.ts
│   │   ├── book-room.ts
│   │   └── reschedule-booking.ts
│   └── policies/            # Business rule enforcement
│       └── booking-change.policy.ts
├── channels/
│   └── web-chat.ts          # Channel adapter
├── knowledge/
│   └── booking-policy.md    # Domain knowledge
├── evals/
│   └── booking-reschedule.eval.ts
└── README.md
```

## Channel Readiness

| Channel | Status |
|---------|--------|
| Web Chat | LOCAL_CONFORMANCE — stub only, add provider for production |

## Next Steps

- Read the [Atlas Quickstart](https://github.com/joyboy257/atlas/blob/main/packages/atlas/docs/QUICKSTART.md)
- Explore the [Agent Guide](https://github.com/joyboy257/atlas/blob/main/packages/atlas/docs/AGENT-GUIDE.md)
- See the [Roadmap](https://github.com/joyboy257/atlas/blob/main/ROADMAP.md) for upcoming features
