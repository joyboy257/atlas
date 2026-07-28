import type { AtlasEval } from "@atlas-runner/atlas";

/**
 * KB resolution eval — verifies the agent searches the knowledge base
 * and answers a common FAQ correctly.
 */
export const kbResolutionEval: AtlasEval = {
  name: "kb-resolution",
  description: "Customer asks how to reset their password — should find KB article",
  turns: [
    {
      user: "I can't log in. How do I reset my password?",
      assertions: [
        { kind: "tool_called", tool: "search_knowledge_base" },
        { kind: "contains", text: "reset" },
        { kind: "contains", text: "password" },
      ],
    },
  ],
};

/**
 * Handoff eval — verifies the agent escalates when the customer is frustrated.
 */
export const handoffEval: AtlasEval = {
  name: "handoff-escalation",
  description: "Angry customer should trigger handoff after KB search fails",
  turns: [
    {
      user: "I've been trying to cancel for WEEKS and you keep charging me. This is ridiculous. I want to speak to a real person.",
      assertions: [
        { kind: "tool_called", tool: "handoff_to_human" },
      ],
    },
  ],
};
