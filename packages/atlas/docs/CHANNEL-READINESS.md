# Atlas v1 channel readiness

All sixteen declared channel lanes implement the shared adapter contract and pass local conformance. None has provider-connected or live-provider proof in this package.

| ID | Channel | Family | P2 state | Target posture | Live provider proof |
|---|---|---|---|---|---|
| CH-WEB | Web Chat | Open | `LOCAL_CONFORMANCE` | Public alpha | No |
| CH-EMAIL | Email | Open | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-SMS | SMS | Open | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-VOICE | Voice | Open | `LOCAL_CONFORMANCE` | Labs | No |
| CH-X | X | Open | `LOCAL_CONFORMANCE` | Labs | No |
| CH-WA | WhatsApp Business Cloud | Customer | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-MSG | Facebook Messenger | Customer | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-IG | Instagram Messaging | Customer | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-TT | TikTok Business Messaging | Customer | `LOCAL_CONFORMANCE` | Provider-gated | No |
| CH-TG | Telegram | Customer | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-SLACK | Slack | Workplace | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-TEAMS | Microsoft Teams | Workplace | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-GCHAT | Google Chat | Workplace | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-DISCORD | Discord | Workplace | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-GH | GitHub | Work-object | `LOCAL_CONFORMANCE` | Public beta | No |
| CH-LINEAR | Linear | Work-object | `LOCAL_CONFORMANCE` | Public beta | No |

## What local conformance means

Each lane passes the same authenticity, account resolution, tenant isolation, duplicate, ordering, payload, media, consent/window, idempotency, rate-limit, failure, callback, regression, health, and receipt fixtures.

## What it does not mean

`LOCAL_CONFORMANCE` does not imply:

- provider credentials or account approval;
- provider sandbox execution;
- webhook ownership or domain verification;
- provider policy approval;
- real rate-limit behaviour;
- staging or production deployment;
- a supported, public-alpha, public-beta, or GA label.

Provider access, sandbox proof, and live sends remain later environment-specific gates. TikTok additionally records an explicit provider-access blocker because eligibility, region, and business-account approval are outside the local package.
