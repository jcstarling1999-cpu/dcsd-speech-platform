---
description: "Use when: update the repo-level Eternal Spirit agents and keep them consistent"
name: "Edit Eternal Spirit Agents"
argument-hint: "Describe the agent changes you want"
agent: "agent"
tools: [read, edit, search]
---
Update the repo-level agent files under .github/agents.

Scope:
- Only edit files in .github/agents
- Do not modify other files unless explicitly asked

Steps:
1. Read the relevant agent file(s) based on the request.
2. Apply the requested changes while preserving YAML frontmatter validity.
3. Keep descriptions keyword-rich and consistent with the agent role.
4. Summarize changes and list which files were edited.

Output:
- Files edited
- Summary of changes
- Any open questions
