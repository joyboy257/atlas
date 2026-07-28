import type { AtlasEval } from "@atlas-runner/atlas";

/**
 * MQL qualification eval — a strong lead should be scored, CRM updated,
 * and a meeting scheduled.
 */
export const mqlFlowEval: AtlasEval = {
  name: "mql-qualification",
  description: "Strong BANT lead should get MQL score and meeting offer",
  turns: [
    {
      user:
        "Hi, I'm the VP of Engineering at a 200-person SaaS company. " +
        "We've budgeted $50k for a workflow automation tool and need something live by Q4. " +
        "Can your product help?",
      assertions: [
        { kind: "tool_called", tool: "score_lead" },
        { kind: "tool_called", tool: "update_crm" },
        { kind: "contains", text: "meeting" },
      ],
    },
  ],
};

/**
 * Cold lead eval — a weak lead should get a low score and no meeting offer.
 */
export const coldLeadEval: AtlasEval = {
  name: "cold-lead-routing",
  description: "Unqualified lead should not get a meeting offer",
  turns: [
    {
      user:
        "Just browsing. Not sure what you do. I'm an intern and don't have any budget.",
      assertions: [
        { kind: "tool_called", tool: "score_lead" },
        { kind: "not_contains", text: "schedule" },
      ],
    },
  ],
};
