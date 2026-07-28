# Atlas Beta Agreement

**Version:** 0.1.0 — Public Beta  
**Effective:** TBD (upon beta launch)  
**Status:** DRAFT — not yet in effect

> **TL;DR:** Atlas is in public beta. It's free during beta. Things may break. Don't use it for production-critical workloads yet. We're transparent about what works and what doesn't. By using the beta, you agree to help us make it better.

## 1. Beta Status

Atlas is in **public beta**. This means:

- **Not production-ready.** The software may have bugs, incomplete features, breaking changes, and security limitations.
- **No SLA.** We do not guarantee uptime, response times, or data durability.
- **Breaking changes.** APIs, CLIs, configuration formats, and package structures may change without notice between beta releases.
- **Readiness is truthful.** All channel adapters, model modes, and runtime features are labeled with their actual readiness state. Read those labels.

## 2. Free During Beta

- **No charges.** All features are free during the beta period.
- **Pricing will change.** We will announce pricing at least 30 days before GA. Your beta usage does not commit you to a paid plan.
- **Usage limits.** We may enforce per-tenant usage limits to prevent abuse. These will be documented and communicated.
- **No payment information collected.** We won't ask for credit cards during beta.

## 3. What You Can Do

- Use Atlas to build and test business messaging agents
- Run the local runtime and sandbox for development
- Connect your own model provider keys (BYOK mode)
- Use the simulator for all 16 supported channels
- Distribute agents built with Atlas under your own terms
- Provide feedback, report bugs, and suggest features

## 4. What You Should Not Do

- **Run production workloads.** Do not rely on Atlas for business-critical messaging in beta.
- **Store sensitive data.** The beta infrastructure has not been security-audited. Do not process PII, PHI, financial data, or credentials through beta services.
- **Connect production provider accounts.** Use test/development provider accounts during beta.
- **Expect stability.** APIs, data formats, and services may change or be unavailable.

## 5. Data Handling

- **Local runtime.** Your data stays on your machine. We do not collect it.
- **Sandbox.** Data is stored in your local Docker volumes. We do not access it.
- **Future hosted services.** When Atlas Cloud launches, data handling will be covered by a separate Terms of Service and Privacy Policy. You will be asked to consent before any data leaves your infrastructure.

## 6. Feedback & Contributions

The beta exists to learn from you. We encourage:

- **Bug reports.** Open a GitHub issue with reproduction steps.
- **Feature requests.** Tell us what you need.
- **Usage data (voluntary).** If you opt in, we collect anonymized usage patterns (commands run, not message content).
- **Contributions.** See [CONTRIBUTING.md](../CONTRIBUTING.md).

## 7. Limitations of Liability

```
ATLAS IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR
A PARTICULAR PURPOSE, AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THE SOFTWARE.

THIS IS BETA SOFTWARE. IT MAY DELETE YOUR DATA, SEND MESSAGES INCORRECTLY,
FAIL TO DELIVER MESSAGES, OR OTHERWISE NOT WORK AS EXPECTED. USE AT YOUR
OWN RISK.
```

## 8. Termination

- **You can stop at any time.** Just stop using Atlas.
- **We can terminate access.** If you abuse the service, violate rate limits, or use Atlas for spam/harassment/illegal purposes, we reserve the right to block your access.
- **Data after termination.** Local data is yours. Hosted data (when available) will be deleted within 30 days of termination.

## 9. Changes to This Agreement

We may update this agreement as the beta evolves. Material changes will be communicated via the GitHub repository. Continued use after changes means you accept the new terms.

## 10. Contact

- **Issues:** https://github.com/joyboy257/atlas/issues
- **Security:** See [SECURITY.md](../SECURITY.md)
- **Email:** TBD (contact maintainer via GitHub)

---

**By using Atlas during the public beta, you acknowledge that you have read and understood this agreement.**

*Last updated: 2026-07-28 (draft)*
