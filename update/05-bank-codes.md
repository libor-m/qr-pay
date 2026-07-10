# PR 5: Refresh bank codes from ČNB

**Goal:** current bank list in `banks.js`, working download script, and the bank-code validation check finally enabled.

## New ČNB URL (verified working 2026-07-09)

The old `http://www.cnb.cz/cs/platebni_styk/ucty_kody_bank/download/kody_bank_CR.csv` is dead. The list moved to:

```
https://www.cnb.cz/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.csv
```

Landing page (in case the path moves again): <https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/>

Format is unchanged from the checked-in copy: UTF-8 with BOM, CRLF, `;`-separated, header row, columns `code;provider;BIC;CERTIS`. Diff against the repo copy shows real churn: **13 codes removed** (2020, 2030, 2240, 2260, 2310, 3050, 4000, 6100 Equa, 7940, 7980, 8200, 8230, 8240), **8 added** (6363 Partners Banka, 6600, 8190, 8198, 8255, 8500, 8610, 8660), and ~12 renames (2070 → TRINITY BANK, 4300 → Národní rozvojová banka, 7960 → ČSOB Stavební spořitelna, …).

## Changes

### `bank_codes.sh`
- Point `wget` at the new URL, use `-O kody_bank_CR.csv` so the filename is explicit.
- Fix the rough edges so no hand-editing is needed ("hand edit the file to remove the last comma" comment goes away):
  - strip BOM and CR (`sed '1s/^\xEF\xBB\xBF//' | tr -d '\r'`),
  - emit valid JS with no trailing-comma problem (trailing commas are legal in object literals since ES5 anyway, so simply keep them and delete the comment),
  - since PR 3 made `banks.js` an ES module, emit `export const banks = {...}`.

### `kody_bank_CR.csv`, `extension/banks.js`
- Regenerate both by running the script; commit the results.

### `extension/popup.js`
- Enable the disabled check in `validateAcc`: `return mod11(pfx) && mod11(num) && (bank in banks);` — the stale bank list was the stated reason it was off (`// TODO enable after testing`). With a fresh list this cuts false-positive account extraction (e.g. dates or IDs that happen to pass mod-11 with a nonsense "bank code").
- Guard the bank label fill: `banks[params.bankCode]` is `undefined` for unknown codes; show empty string instead of `undefined` in the read-only field.

## Files touched
- `bank_codes.sh`, `kody_bank_CR.csv`, `extension/banks.js` (regenerated), `extension/popup.js` (2 lines)

## Acceptance
- `bash bank_codes.sh` runs clean start-to-finish, produces syntactically valid `banks.js` (check with `node --check`), no manual edits.
- Selecting text with a valid account at a current bank (e.g. `…/6363`) extracts and labels it; a mod-11-valid number with bogus bank code `9999` is rejected.
- Existing acceptance flows from PRs 1–4 still pass.

## Ordering note

Sequenced after PR 3 only because of the `export const` form of `banks.js`. If it's wanted earlier, land it right after PR 1 with the old `var banks =` output and flip to `export` in PR 3.
