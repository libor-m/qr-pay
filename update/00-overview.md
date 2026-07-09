# QR Pay modernization plan

Six PRs, ordered by dependency. Each is independently shippable and reviewable.

| PR | File | Scope | Size |
|----|------|-------|------|
| 1 | [01-manifest-v3.md](01-manifest-v3.md) | Manifest V3 migration | small |
| 2 | [02-spayd-encoder.md](02-spayd-encoder.md) | SPAYD encoder + Czech account → IBAN, with tests | medium |
| 3 | [03-qr-rendering.md](03-qr-rendering.md) | Client-side QR rendering, drop the paylibo API | medium |
| 4 | [04-datalist-dropdowns.md](04-datalist-dropdowns.md) | Candidate dropdowns via `<datalist>` | small |
| 5 | [05-bank-codes.md](05-bank-codes.md) | Bank code refresh from new ČNB URL, enable bank validation | small |
| 6 | [06-modernize-js.md](06-modernize-js.md) | ES modules, event-driven updates, CSS cleanup | medium |

## Why this order

1. **MV3 is existential.** Chrome has disabled MV2 extensions for regular users; the extension does not run at all until this lands. Everything else builds on the MV3 baseline.
2. **SPAYD before QR.** The QR code is just a SPAYD string rendered as a QR. The encoder is pure logic (string building + IBAN check digits) and can be written and tested with zero UI changes, while the popup keeps using paylibo. PR 3 then swaps the rendering with the encoder already trusted.
3. **Dropdowns and JS cleanup last.** Both are UI-quality work, independent of the plumbing above. Dropdowns come first because they change behavior visible to the user; PR 6 is behavior-neutral refactoring.
4. **Bank codes (PR 5)** only depend on `banks.js` being an ES module (PR 3); the plan file notes how to land it earlier if desired. The old ČNB download URL is dead; the new verified URL is in [05-bank-codes.md](05-bank-codes.md).

## Corrections to the readme TODO

- **"jQuery substitution of combo-box"**: not needed. The Chromium bug that broke `<datalist>` in extension popups (issue 161302) was fixed in 2015. Plain `<datalist>` works in current Chrome. Also note there is no jQuery anywhere in the codebase today, so "modernizing jQuery to vanilla" reduces to modernizing the existing ES5 vanilla JS (PR 5).
- **"self hosted qr code rendering"**: confirmed feasible, but the SPAYD `ACC` field requires an **IBAN**, not the domestic `prefix-number/bank` format. Czech IBAN construction is deterministic (mod-97 check digits over a fixed BBAN layout), so this stays fully client-side. Covered in PR 2.

## Deferred (not in this plan)

- **"message for self" (`X-ID`/sender reference)**: popup.js already notes that neither paylibo nor Česká spořitelna's app interprets it. Re-test with current banking apps after PR 3, when we control the SPAYD string; file as follow-up if apps now support `X-URL`/`X-ID`.
- **Freeform input validation**: partially addressed by PR 4 (dropdowns constrain input to extracted candidates), PR 2 (IBAN conversion fails loudly on invalid accounts), and PR 5 (unknown bank codes rejected). Full field-level validation UI is follow-up work.
