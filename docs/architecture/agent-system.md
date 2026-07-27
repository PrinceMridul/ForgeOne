# Agent System Architecture

## Agents
| Agent | Role |
|---|---|
| Orchestrator | Task decomposition, routing |
| Product Manager | PRDs, user stories |
| Architect | System design |
| Developer | Code generation |
| Reviewer | Code review |
| Tester | Test generation |
| Security | Vulnerability scanning |
| DevOps | CI/CD, infrastructure |

## Memory
- Short-term: Redis
- Long-term: Qdrant vectors
- Episodic: PostgreSQL

## Tools (MCP Compatible)
- file_read, file_write, file_search
- git_clone, git_commit, git_diff
- terminal_exec
- web_search
- code_analyze
