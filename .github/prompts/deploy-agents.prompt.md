---
description: "Use when: deploy the Eternal Spirit agent suite into a repo"
name: "Deploy Eternal Spirit Agents"
argument-hint: "Target repo root (path). Optional: overwrite=true|false"
agent: "agent"
tools: [read, edit, search, execute]
---
Deploy the Eternal Spirit agent suite into the target repository.

Requirements:
- Source of truth: /Users/justice/Library/Application Support/Code/User/prompts/agents
- Target: <repo-root>/.github/agents
- Agent files:
  - backend-api-wiring.agent.md
  - liquid-glass-design.agent.md
  - api-connectivity-health.agent.md
  - feature-completion.agent.md
  - infra-devops.agent.md
  - testing-qa.agent.md
  - orchestrator-commander.agent.md
  - my-agent.agent.md

Steps:
1. If <repo-root> is not provided, ask for it and wait.
2. Verify the source folder exists and contains the agent files. If missing, stop and report which files are absent.
3. Create <repo-root>/.github/agents if it does not exist.
4. For each agent file, copy content from the source folder to the target.
   - If the target file exists, show a short summary of differences and ask before overwriting.
5. Report the final list of files created or updated.

Output:
- Created files
- Updated files
- Any skipped files and why
