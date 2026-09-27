# Popup UX review — 2026-09-22

Independent PM review of the popup and settings source. Browser rendering and live extension behavior require separate verification.

## Acceptance criteria

| Scenario | Expected experience |
| --- | --- |
| First open, no API key | Quick preview works; AI setup destination is clear before clicking; no unnecessary provider permission prompt. |
| Hundreds of tabs / dozens of groups | Proposed changes appear before the collapsed existing inventory; the results region scrolls while Apply remains reachable. |
| Several windows | Scope is explicit, each proposed group has a stable window label, and copy states tabs stay in their original windows. |
| Already grouped | Existing members are described separately from pinned/playing/private/internal exclusions. Preserve mode with nothing to change explains Regroup. |
| Regroup enabled | Warning sits beside the decision; using existing names remains visibly separate from rebuilding membership. |
| Settings changed after AI preview | Old plan cannot be applied; replacement is explicitly identified as Quick preview; checkbox changes never spend AI calls. |
| AI loading / failure | Status is visible; concurrent mutation is disabled; error identifies that no new AI preview was produced. |
| Review then Apply | New group versus append is visible; group details reveal tabs; primary action reports the number of affected tabs or groups. |
| Apply / Undo | Success and undo availability remain visible; no claim that undo restores closed content. |
| Duplicates | Destructive close lives in a secondary disclosure with actual URLs/titles and an unsaved-edit warning. Restore is clearly URL-only. |
| Empty / no eligible tabs | Explain why nothing changes and offer the relevant scope or Regroup action; Apply stays disabled. |
| Languages / narrow popup | At 380×560, long translations and titles do not widen the popup or hide primary action; keyboard focus stays visible. |

## Initial priorities

1. **P1:** Existing groups precede changes and default open. Large inventories hide the actual work.
2. **P1:** All-windows results have no window identity, making equal names ambiguous.
3. **P1:** Setting changes silently replace AI output with Quick preview.
4. **P2:** Missing API key is known at startup but AI has no setup affordance.
5. **P2:** Duplicate restore and secondary operations occupy permanent footer space.
6. **P2:** Generic empty-state copy does not distinguish all-grouped, protected-only, and unmatched tabs.

## Revision review

Two review rounds completed. Round 1 addressed the main hierarchy, scope identity, AI setup and result-source confusion. PM feedback then found stale duplicate controls after a failed refresh, generic protected-only empty copy, and uncollapsed suggestion members. Round 2 fixed all three in source.

PM inspected the designer’s final English 380×560 Chromium screenshot: scope/options precede preview, four proposal rows are visible, and Apply/Undo remain fixed. This is visual inspection of a rendered fixture, not execution against the user’s installed extension. Root owns the expanded interactive scenario and locale matrix verification.

No remaining P1/P2 blocker was found in this bounded review. Window ordinals identify groups within the current preview; they are not persistent browser window names. Algorithm quality and real installed-extension behavior are outside this UX approval.

The 11 new UI messages were translated into all eight non-English locales. `node --test tests/i18n.test.js` passed 2/2, including placeholder checks. Native-speaker review has not been performed.

## Integrated execution receipt

Root verified the uncommitted working tree based on b3f3eb5 on 2026-09-22:

- `npm test`: 82/82 passed; `npm run check` and `git diff --check` passed.
- `tests/ui-smoke.mjs`: all 18 language/theme combinations passed at 380×560. UI fixtures include 213 tabs and 24 proposals, two window labels, no-key setup, settings failure, stale duplicate controls, already-grouped/protected-only/zero-tab states, loading, Apply/Undo dispatch, and a 100-member collapsed suggestion. These checks use the real UI with a fixture runtime, not real classification results.
- `tests/native-groups.mjs`: five isolated Chromium scenarios passed. The final scenario loads the actual extension and exercises popup Preview → Apply → Undo through the actual service worker and native tab-group APIs, checking membership and window preservation. Earlier scenarios cover append, regroup, protected members and cross-window behavior.
- Updated English/Korean example screenshots: `docs/assets/popup-en.png`, `docs/assets/popup-ko.png`.
- No live user tabs were moved. Reload and toolbar-popup behavior in the user's installed Chrome remain unverified. No new algorithm-quality claim or release promotion is implied.

Run browser checks with the existing Playwright installation supplied through `PLAYWRIGHT_MODULE`.

### Generation integration follow-up

The latest working tree passes 94 unit/regression checks and all 18 locale/theme UI combinations. The popup discloses GPT-4.1 name generation when OpenRouter discovery is enabled; Apply/Undo remain within the 380×560 viewport. A failed planner with an empty plan no longer claims that groups are ready. Five isolated native Chromium scenarios passed with the integrated module. This does not promote classification quality or verify the user's installed Chrome instance.

### Product designer / PM follow-up — 2026-09-22

A fresh designer → PM feedback → implementation → PM source review cycle refined the existing layout rather than replacing it. Common controls now read Regroup → Use existing group names, followed by saved-category and discovery choices. Preserve mode remains explicit. Apply reports unique affected tabs; existing inventory stays secondary, and Apply/Undo stay fixed. Quick preview no longer displays a GPT naming claim, and refresh callers preserve planner errors instead of replacing them with success copy.

The PM also identified settings feedback below the fold and an untranslated provider explanation after language changes. Settings now keeps feedback in a reserved bottom area with an alert role for errors and updates provider text when switching language. The Apply label is translated into all eight non-English locales. PM source review found no remaining P1/P2 blocker in this bounded flow.

Validation for this follow-up: 95 unit checks passed; popup syntax and the two locale checks passed after the designer edits. All five isolated native Chromium scenarios passed, including actual service-worker popup Preview → Apply → Undo. User Chrome tabs were not changed; installed toolbar popup behavior remains unverified.

Final rendered UI verification passed all 18 combinations (9 languages × light/dark, 380×560; 12.7 seconds). Added interaction checks cover control order, unique Apply count, preserve notice, Quick/AI provider explanation, persistent error alerts, visible settings feedback, and provider translation on language changes. English/Korean screenshots were refreshed; root visually inspected the Korean result. These UI scenarios use fixture tab data, while the five native scenarios above exercise actual extension APIs in an isolated browser.
