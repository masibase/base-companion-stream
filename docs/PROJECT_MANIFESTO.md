# Project manifesto

Agent Companion is an open-source project in spirit from day one: docs first,
standards from the start, contributions welcome.

## Seven commitments

1. **Human in control** — agents assist, never own the stream. The creator
   approves; agents suggest.
2. **No feature without an agent** — features are owned by an agent, never
   ad-hoc code drifting outside the architecture.
3. **No agent without a workflow** — behavior is declared, reviewed, and
   testable (`docs/WORKFLOWS.md`).
4. **Provider agnostic** — no vendor lock-in. Local-first where possible;
   the cloud is optional.
5. **Plugin first** — capabilities are replaceable modules; the core stays
   small and boring.
6. **Privacy by design** — keys local, data local, export/import under the
   user's control.
7. **Boring reliability** — every significant action is logged, every
   decision is testable, every merge keeps lint + typecheck green.

## For contributors

- Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORKFLOWS.md` first.
- New feature? Name its agent and its workflow before writing code.
- Docs stay in sync with code — a feature is not done until its docs land.
