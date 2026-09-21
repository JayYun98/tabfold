# Existing-group classification research

Parent: `35744db` (v0.9.1). Objective: maximize defensible assignment to existing category/project names without forcing unrelated tabs together or moving tabs between windows. Coverage is not accuracy. Current browser inventory: 257 visible tabs; join with local window inventory by tab ID, exclude unmatched/internal tabs. Raw titles/URLs/results stay in ignored `.private/research/`.

Budget: baseline + three candidate families; at most one full Jev pass (20 sequential requests maximum), then focused local/regression checks. No actual tab mutation. Stop after one integrated candidate beats baseline on explicit intent checks without safety regression, or budget exhausted. Deterministic input order; no random seed. No external leaderboard submissions.

| Beam | Hypothesis / gates | Evidence / score | Decision |
|---|---|---|---|
| Baseline | v0.9.1 `clusterTabs`; first-three examples, no category-name meaning | Pending leave-one-out audit | Run |
| A exploitation | `groupContext`, `matchExistingGroup`: category-aware site rules and diverse samples | Synthetic same-window safety checks pass | Combine with B |
| B structural | Existing-group purpose before new categories; reuse category names across windows without moving tabs; Jev gets purpose-rich choices | Pending live bounded pass | Run |
| C near-miss | Embedding-only distance ranking | Advisor: embeddings do not resolve category-versus-topic policy; no measured model candidate | Defer behind A+B; revisit if synonym misses dominate |

Audit prevents self-membership and duplicate URL/title leakage when evaluating existing-group examples. Existing automatically generated domain groups are not ground truth. Explicit YouTube→Media/SNS intent is a valid check; other labels are provisional review targets. Scores are reported with coverage/abstention and labeling limitations.

## Completed comparison

- [20260922T021122+0900_baseline.md](../submit_logs/20260922T021122+0900_baseline.md)
- [20260922T021122+0900_name-only.md](../submit_logs/20260922T021122+0900_name-only.md)
- [20260922T021122+0900_purpose-local.md](../submit_logs/20260922T021122+0900_purpose-local.md)
- [20260922T021122+0900_jev-full.md](../submit_logs/20260922T021122+0900_jev-full.md)
- [20260922T021122+0900_integrated-focused.md](../submit_logs/20260922T021122+0900_integrated-focused.md)

- Baseline:64/245 existing-name coverage; name-only:48/245; category-purpose local:96/245. These are leave-one-out assignment audits, not complete batch regroup counts.
- Full live Jev:174/245 existing-name coverage,16requests,9.838s. After deterministic media/jobs routing, cached-response replay reused183names. Final focused live check:YouTube9/9, LinkedIn job proxy11/11, OpenCodex8/8. Total20requests,$0.02541353.
- Full local245-tab batch measured437ms and~15MiB Node heap in one local run; not a browser latency guarantee. Hot path recomputes diverse lexical examples per tab; no new model download or dependency.
- Promote A+B; discard C name-only standalone on objective regression; embedding family deferred, not declared inferior without measurement. No additional paid trials.
- Existing Chrome groups contain prior automatic errors, so no global accuracy percentage is claimed. User tabs were read only. Review artifact remains local and ignored.

## Preferred-label optimization (parent a8230b8)

User gold: Toss Invest→Investment; Google search results→Google search, including technical/garbled queries. These explicit preferences outrank topic similarity and model decisions. New budget: local-only tests/replay,0paid requests; stop when supplied gold+negative boundaries pass and independent reviewer has no blocking case.

- Beam1 topic inference (parent) missed20/20 targeted snapshot labels.
- Beam2 explicit host/path preferences passes6/6supplied examples and20/20related snapshot tabs,0off-target assignments. Do not broaden to all Google or all Toss services.
- Combined beam adds stable preferred identity in shared preview to avoid duplicate groups from AI/custom colors. Reviewer found this defect in round2 and verified correction in round3. Ambiguous duplicate physical targets abstain rather than form a third group.
- Full local clustering+preview measured481ms in one run. No embedding dependency or new API call. Other245-tab candidate rows are cached-answer replay, not reverified ground truth.

- [20260922T022348+0900_preferred-policy.md](../submit_logs/20260922T022348+0900_preferred-policy.md)
- [20260922T022348+0900_duplicate-review.md](../submit_logs/20260922T022348+0900_duplicate-review.md)
- [20260922T022348+0900_preferred-integrated.md](../submit_logs/20260922T022348+0900_preferred-integrated.md)

### 2026-09-22 — hiring URL regression
- User examples exposed missing jobs.ashbyhq.com / careers.nebius.com purpose detection and title-fragment fallback. Shared preferred routing now reuses recruiting categories or defaults to Job.
- Review fixed cross-window template bypass and ambiguous duplicate Job Recruit targets;73tests pass. Previous snapshot replay:7/7affected tabs → Job Recruit; no additional API spend.

- Mixed Ashby + LinkedIn singleton candidates now share the reused recruiting name identity; Quick/AI preview regression passes.
