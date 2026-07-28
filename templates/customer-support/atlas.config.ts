import { defineAtlasProject } from "@atlas-runner/atlas";

export default defineAtlasProject({
  schemaVersion: "1",
  project: {
    name: "customer-support",
    description:
      "Customer support agent — knowledge base search, ticket creation, human handoff",
  },
  runtime: {
    mode: "native",
  },
  model: {
    mode: "local-fixture",
  },
  agent: {
    instructions: "./agent/instructions.md",
    tools: "./agent/tools",
    policies: "./agent/policies",
  },
  knowledge: ["./knowledge"],
  channels: ["./channels/web-chat.ts", "./channels/email.ts"],
  evals: ["./evals"],
});
