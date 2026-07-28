import { defineAtlasProject } from "@atlas-runner/atlas";

export default defineAtlasProject({
  schemaVersion: "1",
  project: {
    name: "lead-qualification",
    description:
      "Lead qualification agent — scoring, enrichment, CRM update, meeting scheduling",
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
  channels: ["./channels/web-chat.ts"],
  evals: ["./evals"],
});
