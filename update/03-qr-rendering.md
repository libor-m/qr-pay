# PR 3: Client-side QR rendering, remove paylibo

**Goal:** the QR is generated locally from the PR 2 SPAYD string. No network access at all; payment data never leaves the machine (a real privacy win worth mentioning in the store listing).

## Library choice

Requirements: zero dependencies, recent maintenance, vendorable as a single ESM file (no bundler in this repo, and none should be added for a 4-file extension).

| Option | Verdict |
|--------|---------|
| **[@paulmillr/qr](https://github.com/paulmillr/qr)** (npm `qr`) | **Recommended.** Zero-dep, actively maintained (2025 releases), MIT/Apache-2.0, ships an ESM build with SVG/GIF output helpers, audited, fast. |
| [Nayuki qrcodegen](https://github.com/nayuki/QR-Code-generator) | Solid fallback: ~1000-line single file, MIT, reference-quality. Generator only — you draw the matrix to canvas yourself (trivial). Less active release cadence. |
| `qrcode` (npm, soldair) | Rejected: has dependencies, node-oriented. |
| davidshimjs/qrcodejs (the one in popup.js's old comment) | Rejected: unmaintained for a decade, not ESM. |

Vendor the chosen lib into `extension/vendor/qr.js` with a header comment stating version + source URL + license. Pin it; no package manager needed at runtime.

## Changes

### `extension/popup.html`
- Load scripts as modules: `<script type="module" src="popup.js"></script>`, drop the separate `banks.js` tag (import it instead — make `banks.js` export the object).
- Replace `<img id="qr_img">` with a container that receives the generated SVG (or a `<canvas>` if Nayuki). Keep `img/empty-qr.png` as the empty-state.

### `extension/popup.js`
- `import { spayd } from './spayd.js'` and the QR lib from `./vendor/qr.js`.
- `displayQR(params)` becomes: build SPAYD string → render SVG → inject; on encoder error (invalid account) or missing account/amount, show empty state.
- Delete `qr_api`, `obj2uri`.
- SPAYD QRs conventionally use error correction **M**; medium size (~300 px, matching current layout) with quiet zone.

### `extension/manifest.json`
- Nothing to add — no host permissions were ever declared for paylibo, and now none are used. Bump version.

## Files touched
- `extension/vendor/qr.js` (new, vendored)
- `extension/spayd.js` (from PR 2, unchanged or minor)
- `extension/popup.js`, `extension/popup.html`, `extension/banks.js` (export), `extension/manifest.json` (version)

## Acceptance
- End-to-end: select real payment text → popup renders QR **offline** (test with network disabled in devtools).
- Scan the QR with a Czech banking app (ČS George / Air Bank / Fio) and confirm the payment prefills identically to the paylibo version for the same input.
- Edited form fields regenerate the QR; clearing account/amount shows the empty placeholder.
