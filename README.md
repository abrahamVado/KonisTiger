# Atlante

## Purpose
Principal Electron app that discovers, loads, and hosts all modules as plugins (the hub).

### Example Uses
- **Scenario A:** (Describe a concrete user flow this module enables.)
- **Scenario B:** (Another realistic workflow with expected inputs/outputs.)
- **Scenario C (Edge):** (What happens offline, on failure, or with large data.)

---

## Developer Notes — *Super Comments*
> This section guides implementation decisions as living documentation.

- **Security:** Threat model, permissions required, secret handling, error redaction.
- **IPC Surface:** Namespaced channels (`atlas:*`), payload shapes, validation rules.
- **Data Model:** Tables/keys (SQLite) or config schema; migration plan.
- **UX Contracts:** User affordances, confirmations, and failure states.
- **Performance:** Expected scale, caching, pagination/virtualization, snapshots.
- **Testing:** Unit, IPC, end‑to‑end flows; fixtures and golden files.

---

## Multilingual Notes
- 日本語 (Japanese):
  - こんにちは！日本から来た**佐藤愛子**です。Atlasは、すべての交換留学生（プラグイン）が教室と時間割を見つけるキャンパスのようだと感じています。これから、Atlasが各モジュールをどのように読み込み、検証し、

## Introduction (by an exchange student)
Hello! I'm **Aiko Sato** from Japan. I see Atlas as the campus where every exchange student (plugin) finds a classroom and a schedule. I'll start by documenting how Atlas loads, verifies, and safely sandboxes each module.