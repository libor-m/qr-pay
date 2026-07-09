# PR 1: Manifest V3 migration

**Goal:** the extension loads and works in current Chrome. No feature changes.

## Changes

### `extension/manifest.json`
```json
{
  "manifest_version": 3,
  "name": "QR Pay",
  "version": "0.3.0",
  "description": "…(unchanged)…",
  "icons": { "16": "…", "48": "…", "128": "img/icon-qr-128.png" },
  "action": {
    "default_icon": "img/icon-qr-16.png",
    "default_title": "QR Pay: označ text a klikni",
    "default_popup": "popup.html"
  },
  "permissions": ["activeTab", "scripting"],
  "minimum_chrome_version": "102"
}
```
- `browser_action` → `action`.
- Add `"scripting"` permission (required for `chrome.scripting.executeScript`; combined with `activeTab` it still prompts for nothing and grants access only to the clicked tab).
- The 128px icon already exists in `img/` but was never declared; declare it (required for Web Store).

### `extension/popup.js` (bottom of file only)
Replace the deprecated injection call:
```js
// before
chrome.tabs.executeScript(null, {file: "injected.js"});
```
```js
// after
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const [{ result }] = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    const sel = window.getSelection();
    return sel.isCollapsed ? null : sel.toString();
  },
});
if (result) processText(result);
```

- `scripting.executeScript` returns the injected function's return value directly, so the `chrome.runtime.sendMessage` / `onMessage` round-trip and **`injected.js` are deleted entirely**. Wrap the above in an async IIFE or top-level `init()`.
- Everything else in popup.js stays untouched (the 500 ms ticker, paylibo URL, etc. — later PRs).

### Notes
- MV3's extension-page CSP (`script-src 'self'`) does **not** block remote images, so the paylibo `<img>` keeps working until PR 3 removes it.
- No background/service worker is needed; this extension has none and gains none.

## Files touched
- `extension/manifest.json` (rewrite)
- `extension/popup.js` (bottom ~5 lines)
- `extension/injected.js` (delete)

## Acceptance
- Loads via `chrome://extensions` → Load unpacked with no MV3 warnings.
- Select payment text in any page → click icon → form is prefilled and paylibo QR renders, same as v0.2.2.
- Clicking the icon with no selection shows the empty-QR placeholder, no console errors.
