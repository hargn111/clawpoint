# Clawpoint

Clawpoint is a focused dashboard for OpenClaw.

It is meant to give one clean place to see what matters, move between active workstreams, and eventually take action without bouncing between raw chat, logs, and scattered internal surfaces.

## Goals

Clawpoint is aimed at a few practical outcomes:

- a calmer, faster operational view of OpenClaw
- a better session-oriented workspace than raw chat alone
- optional todo visibility and management when Task Garden is available
- a UI that can feel polished enough to keep open as a real daily surface

## Current direction

The project is starting as a thin dashboard layer, not a fork of the main OpenClaw interface.

The intent is to build a product-like control surface with:

- session visibility
- reminder visibility
- health and status panels
- room for richer workflow management over time

## Core design principles

### 1. Session-first

Clawpoint should treat sessions as first-class objects, not just message history. It should be easy to see what is active, what is stale, and what needs attention.

### 2. Clean optional integrations

Todo features should work through Task Garden when it is present.

If Task Garden is not available, Clawpoint should simply exclude todo UI features cleanly rather than showing broken controls, error-heavy placeholders, or partial dead panels.

### 3. Thin, not tangled

The UI should stay relatively thin. It should present state well, coordinate actions clearly, and avoid becoming a sprawling second backend unless that is truly necessary.

### 4. Product quality over demo quality

This should not feel like a one-off internal toy. It should move toward a coherent, branded, daily-usable interface.

## Planned feature areas

### Session management

- live session list with clear state and recency
- quick jump between active sessions
- better visibility into ownership, activity, and pending work
- controls for common session actions
- clearer distinction between direct chats, heartbeats, cron-driven work, and delegated work

### Todo management

When Task Garden is available:

- planned and unplanned todo views
- reminder visibility
- due and overdue surfacing
- lightweight create, edit, complete, reopen, and reprioritize flows
- clean mapping between operational reminders and todo state

When Task Garden is not available:

- todo tabs and controls should disappear or remain gracefully disabled at the product level
- the rest of Clawpoint should continue to function normally

### Tabbed interface

Planned navigation should likely move toward a tabbed or sectioned workspace, with candidates such as:

- Overview
- Sessions
- Todos
- Reminders
- Health
- Settings

The exact shape may change, but the interface should support fast switching between modes without feeling crowded.

### UI quality improvements

- stronger visual hierarchy
- better density control for long-running operational use
- clearer empty states and loading states
- more consistent status language and badges
- smoother refresh behavior
- improved mobile and narrow-width layouts
- better component consistency across panels
- more deliberate branded identity and polish

### Additional product ideas

- configurable home view
- saved views or filters
- richer reminder timeline views
- action history / audit-style visibility
- inline status explanations
- more useful cross-panel linking between sessions, reminders, and todos

## Current capabilities

Today, Clawpoint already has:

- a tabbed workspace with Overview, Sessions, Task Garden, Reminders, Health, Logs, and Settings views
- a live overview screen
- live session visibility plus a shared session editor for creating and updating sessions
- Task Garden task management with a shared create/edit panel when Task Garden is available
- visible manual refresh controls for session and task lists
- live health visibility
- Task Garden-backed reminder visibility when Task Garden is available
- clean omission of task-backed reminder UI when Task Garden is unavailable

## Roadmap

### Phase 1, structured navigation

- introduce a tabbed interface
- separate overview from focused management screens
- improve information architecture for longer daily use

### Phase 2, task and session operations

- add session management affordances
- add todo management when Task Garden is available
- make operational actions feel deliberate and safe

### Phase 3, polish and product maturity

- improve interaction quality throughout the UI
- refine branding and visual system
- reduce rough edges, ambiguity, and noisy states

## Scope boundaries

Clawpoint should not depend on environment-specific setup details being visible in the README.

The only integration assumption worth documenting here is Task Garden for todo functionality, and even that should remain optional from the user experience point of view.

## Near-term priorities

- strengthen the information architecture within the existing tabbed workspace
- deepen session management views
- expand task management flows on top of optional Task Garden detection
- improve overall UI quality until the interface feels intentional rather than merely functional
- keep the operational surfaces feeling fast, legible, and trustworthy during day-to-day use

## Status

Early, promising, and still shaping itself.

The right first standard is not feature count. It is whether Clawpoint is becoming a surface that is pleasant, legible, and useful enough to deserve a permanent place in the workflow.
