# PR 6: Modernize JS + popup cleanup

**Goal:** behavior-neutral refactor. Note the readme's "modernizing jQuery" premise is moot — there is no jQuery in the codebase; this PR modernizes the existing ES5 vanilla JS and the popup markup/CSS.

## Changes

### Kill the polling ticker
`popup.js` runs `setInterval(ticker, 500)` and deep-compares the whole params object (`objEquals`) to detect edits. Replace with one event listener:
```js
document.querySelector('form').addEventListener('input', onFormChange);
```
Delete `objEquals`, `ticker`, `qr_params`, and the interval. `onFormChange` = collect → update bank label → render QR. Debounce (~200 ms) only if QR generation visibly flickers while typing; local generation is fast enough that it likely won't.

### Language cleanup (`popup.js`, `spayd.js` already modern)
- `var` → `const`/`let`; function expressions → arrows where anonymous; template literals for string building.
- `update(o, other)` → `Object.assign`; delete `arrayMax` (already dead code); `extractAll` → `[...s.matchAll(re)]` (also fixes the implicit-global `match` leak on line 64).
- Split popup.js into modules while at it: `extract.js` (the regex extractors — pure, testable) and `popup.js` (DOM wiring). Add `extract.test.js` with a few real-world email snippets under `node --test` alongside the PR 2 tests. This is the highest-value piece of the PR: the extractors are the risky code and currently have zero tests.

### Markup/CSS (`popup.html`)
- Fix invalid HTML: the `<table>` is never closed and `</form>` closes inside it; the `<form>`/`<table>` nesting is broken today.
- Replace the layout table with CSS grid (`label / input` two-column). Move inline styles to a small `popup.css`.
- Add `lang="cs"` and input niceties: `inputmode="numeric"` on symbol fields, `inputmode="decimal"` on amount.

## Files touched
- `extension/popup.js` (rewrite, shrinks)
- `extension/extract.js`, `extension/extract.test.js` (new, code moves out of popup.js)
- `extension/popup.html`, `extension/popup.css`
- `extension/manifest.json` (version)

## Acceptance
- `node --test extension/` green (spayd + extract suites).
- Manual pass of the PR 1 and PR 4 acceptance flows — identical behavior, no 500 ms lag between typing and QR update (it should now be instant).
- No console warnings; HTML validates.
