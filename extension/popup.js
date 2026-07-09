//
// popup logic:
// - grab the selected text from the active tab
// - extract payment details and prefill the form (extract.js)
// - re-render the SPAYD QR code on every edit (spayd.js + vendor/qr.js)
//
import { banks } from './banks.js';
import { spayd } from './spayd.js';
import encodeQR from './vendor/qr.js';
import { extractDetails, accountStr, parseAccount } from './extract.js';

const getVal = (id) => document.getElementById(id).value;

const fillForm = (id, val) => {
    document.getElementById(id).value = val;
};

// clear and repopulate a datalist with candidate values
const fillOptions = (id, values) => {
    const dl = document.getElementById(id);
    dl.textContent = '';
    for (const v of values) {
        dl.appendChild(new Option(v, v));
    }
};

// drop duplicates, keeping first occurrence (Array.filter callback)
const uniq = (v, i, arr) => arr.indexOf(v) == i;

// the main worker
// - extract all possible payment details
// - prefill the form with the most likely candidate
// - offer all the alternatives in each field's datalist
function processText(msg) {
    const vals = extractDetails(msg);

    // accounts come out of extractAccounts in confidence order:
    // fully formed prefix-number/bank matches first, bank-less guesses last
    const accs = vals.accounts.map(accountStr).filter(uniq);
    fillOptions('to-options', accs);
    if (accs.length > 0) {
        fillForm('to', accs[0]);
    }

    // prefer the highest amount found
    const amounts = vals.amounts.filter(uniq)
        .sort((a, b) => parseFloat(b) - parseFloat(a));
    fillOptions('amount-options', amounts);
    if (amounts.length > 0) {
        fillForm('amount', amounts[0]);
    }

    // symbols keep extraction order
    for (const [field, values] of [['vs', vals.vsymbols],
                                   ['ss', vals.ssymbols],
                                   ['ks', vals.ksymbols]]) {
        const vs = values.filter(uniq);
        fillOptions(field + '-options', vs);
        if (vs.length > 0) {
            fillForm(field, vs[0]);
        }
    }

    // TODO: add custom messages for sender (use window title as default)
    // need to ask CS if they read it from any spayd field

    onFormChange();
}

// collect values from the form into a params object
function collectParams() {
    const res = parseAccount(getVal('to'));
    for (const f of ['amount', 'vs', 'ss', 'ks', 'message']) {
        const v = getVal(f);
        if (v != '') {
            res[f] = v;
        }
    }
    return res;
}

// render the SPAYD string as a QR code, all locally -
// payment data never leaves the machine
function displayQR(params) {
    const img = document.getElementById('qr_img');
    if (params.accountNumber && params.amount) {
        try {
            // error correction M is the qr-platba.cz convention
            const svg = encodeQR(spayd(params), 'svg', { ecc: 'medium', border: 2 });
            img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
            return;
        } catch (e) {
            // invalid params (bad account, amount..) fall through to empty state
        }
    }
    img.src = 'img/empty-qr.png';
}

function onFormChange() {
    const params = collectParams();
    // bank name is 'read only', only for control
    fillForm('bank', banks[params.bankCode] || '');
    displayQR(params);
}

document.querySelector('form').addEventListener('input', onFormChange);

// grab the selected text from the active tab and process it
async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const sel = window.getSelection();
            return sel.isCollapsed ? null : sel.toString();
        },
    });
    if (result) processText(result);
}
init();
