# PR 4: Candidate dropdowns via `<datalist>`

**Goal:** the readme's "show all available strings for all fields". The extractor already collects *all* candidates (`extractDetails` returns arrays); today `processText` throws away everything but the first pick. Surface the rest.

## The old blocker is gone

The comment in `popup.js` cites Chromium issue 161302 (datalist dead in extension popups). That was fixed in Chrome in 2015. Plain `<datalist>` works in current Chrome popups — no jQuery combo-box substitute needed. Verify once manually in the loaded extension before building on it (5-minute smoke test); if some regression shows up, the fallback is a small hand-rolled dropdown, but do not plan for that.

## Changes

### `extension/popup.html`
For each candidate-bearing field, attach a datalist:
```html
<input id="to" list="to-options" /><datalist id="to-options"></datalist>
```
Fields: `to` (accounts), `amount`, `vs`, `ss`, `ks`. `message` stays free-form; `bank` stays read-only.

### `extension/popup.js`
- New helper `fillOptions(id, values)` — clears and repopulates the `<datalist>` with `<option>` elements.
- `processText` fills both the input (first/preferred candidate, as today) and the datalist (all candidates, preference-sorted).
- Ordering: keep the existing preferences explicit — accounts with known bank codes first (the hardcoded "prefer 0800/Česká spořitelna" hack should either be kept deliberately or dropped here; **recommendation: drop it**, sort by extraction confidence instead: fully-formed `prefix-number/bank` matches before bank-less guesses). Amounts sorted descending (current comment says "pick highest" but the code actually just takes the first — this PR is the place to make it true).
- Deduplicate candidates before populating.

## Files touched
- `extension/popup.html` (~10 lines)
- `extension/popup.js` (`processText` + one helper, ~30 lines)

## Acceptance
- Select text containing two account numbers and two amounts → both fields prefill with the preferred candidate, and clicking/focusing the field offers the alternatives; picking one regenerates the QR.
- Typing a custom value still works (datalist is suggestive, not restrictive).
- Single-candidate and zero-candidate cases behave as before.
