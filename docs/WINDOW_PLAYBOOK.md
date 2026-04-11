# Window Playbook

This file explains how to run the project across multiple AI chat windows without losing control.

## 1. Recommended Window Roles

### Window A: Main coordinator

Use this window as the source of truth.

Responsibilities:

- choose the next task
- update `docs/TASK_TRACKER.md`
- review incoming work from other windows
- merge decisions into the main plan

### Window B: Second Codex

Use this window for one bounded engineering task at a time.

Good fits:

- UI pass
- config review
- code review on a completed task

### Window C: OpenCode

Use this window for scoped worker tasks with a narrow write set.

Good fits:

- skill asset writing
- prompt asset writing
- isolated UI polish

## 2. Rules For Every New Window

Before a new window starts real work, give it:

1. The project summary from `docs/PROJECT_HANDOFF.md`
2. The exact task from `docs/TASK_TRACKER.md`
3. The constraints section
4. The allowed write scope
5. The required final output format

## 3. Standard Task Packet

Use this template when you open a new window:

```text
Project:
- BSC meme affinity platform
- Two products: website + one OpenClaw query skill

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your task:
- <paste task id and task name>

Allowed write scope:
- <list exact folders/files>

Do not edit:
- <list exact folders/files>

Goal:
- <one clear goal>

Constraints:
- Do not change architecture
- Do not revert others' work
- Keep contracts stable
- At the end, list files changed and any follow-up risks
```

## 4. Review Loop

For each task:

1. Worker window completes one task
2. Worker reports:
   - files changed
   - what was done
   - what remains risky
3. Main coordinator reviews the result
4. Main coordinator either:
   - accepts and marks `done`
   - requests a revision and marks `review`
   - rejects and reassigns

## 5. Recommended Split Right Now

### Main window

- Do `T2` config system hardening

### OpenCode window

- Do `T4` CZ persona analyzer asset preparation
- Do `T9` final OpenClaw skill scaffold

### Extra Codex window

- Optional `T8` website product pass

## 6. Handoff Back Template

Ask each worker window to end with this structure:

```text
Task completed:
- <task id>

Files changed:
- <file 1>
- <file 2>

Summary:
- <short summary>

Risks / follow-ups:
- <risk 1>
- <risk 2>
```

## 7. Important Reminder

Only one window should own integration work at a time.

That means these should stay with the main coordinator window unless you explicitly change ownership:

- `POST /api/score-token`
- final contract changes in `packages/core`
- deployment files
- final merge of external worker changes
