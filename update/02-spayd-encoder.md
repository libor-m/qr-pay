# PR 2: SPAYD encoder + Czech IBAN conversion

**Goal:** a pure, tested `spayd.js` module that turns the form's params object into a valid SPAYD string. No UI changes yet — the popup still uses paylibo. This PR is logic + tests only, so review is easy and PR 3 becomes a small swap.

## Background

The paylibo API does exactly two things we can do locally:
1. Encode params as a SPAYD string (`SPD*1.0*ACC:CZ…*AM:…*CC:CZK*X-VS:…`), per the spec in `specifikace spayd.pdf`.
2. Render that string as a QR code (PR 3).

The one nontrivial part: SPAYD's `ACC` field takes an **IBAN**, while we hold `prefix / number / bankCode`. Czech IBAN is deterministic:

```
BBAN  = bankCode(4) + prefix zero-padded to 6 + number zero-padded to 10
check = 98 - (numeric("CZ00" appended form) mod 97)   // standard ISO 13616 mod-97
IBAN  = "CZ" + check(2) + BBAN
```
The mod-97 must run on the rearranged string `BBAN + "123500"` ("CZ00" with C=12, Z=35) using big-int-safe chunked modulo (the number exceeds 2^53; use `BigInt` or 9-digit chunking).

## New files

### `extension/spayd.js`
```js
export function czIban(prefix, number, bankCode) → "CZxx…"    // throws on non-numeric/overlong input
export function spayd({accountPrefix, accountNumber, bankCode,
                       amount, vs, ss, ks, message}) → "SPD*1.0*ACC:…*…"
```
Encoding rules to implement (from the spec):
- Fixed header `SPD*1.0`, fields joined by `*`, key and value separated by `:`.
- `ACC:` IBAN. `AM:` amount with `.` decimal separator, max 2 decimals. `CC:CZK` always.
- `X-VS` / `X-SS` / `X-KS`: digits only, max 10.
- `MSG:` value must not contain `*`; percent-encode characters outside the allowed set (the spec allows `%xx` escaping); trim to 60 chars.
- Omit empty/undefined fields entirely.

### `extension/spayd.test.js`
Plain `node:test` + `node:assert` — zero dev dependencies, run with `node --test extension/`. Cases:
- IBAN check digits for known accounts (e.g. `19-2000145399/0800` → `CZ6508000000192000145399`, verifiable against any public IBAN calculator; include 2–3 fixtures across banks, with and without prefix).
- Padding of short prefixes/numbers.
- Full SPAYD string equality against strings produced by the current paylibo API for the same params (capture 2–3 real responses before starting — paylibo has a `/czech/string` endpoint that returns the SPAYD text).
- `MSG` sanitization: asterisk stripped/escaped, diacritics pass through, length cap.
- Field omission when values are empty.

## Files touched
- `extension/spayd.js` (new)
- `extension/spayd.test.js` (new)

## Acceptance
- `node --test extension/` green.
- SPAYD output byte-identical to paylibo's `/czech/string` for the fixture params.
- Popup behavior unchanged (module not wired in yet).
