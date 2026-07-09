// SPAYD (Short Payment Descriptor) encoder for Czech domestic payments
// spec: https://qr-platba.cz/ (also 'specifikace spayd.pdf' in repo root)
//
// output is byte-compatible with the paylibo generator
// (https://api.paylibo.com/paylibo/generator/czech/string) so QR codes
// produced locally scan identically in banking apps

// Czech domestic account (prefix-number/bank) -> IBAN, per ISO 13616.
// BBAN layout for CZ: bank code (4) + prefix (6, zero padded) + number (10, zero padded).
export function czIban(prefix, number, bankCode) {
    const p = String(prefix ?? '').trim() || '0';
    const n = String(number ?? '').trim();
    const b = String(bankCode ?? '').trim();
    if (!/^\d{1,6}$/.test(p) || !/^\d{1,10}$/.test(n) || !/^\d{4}$/.test(b)) {
        throw new Error(`invalid account: ${p}-${n}/${b}`);
    }
    const bban = b + p.padStart(6, '0') + n.padStart(10, '0');
    // check digits: mod 97 of BBAN + 'CZ00' with letters transliterated (C=12, Z=35);
    // the number exceeds 2^53, hence BigInt
    const check = 98n - BigInt(bban + '123500') % 97n;
    return 'CZ' + String(check).padStart(2, '0') + bban;
}

// amount with dot decimal separator and exactly 2 decimals, e.g. '250.00'
function formatAmount(amount) {
    const a = Number(String(amount).replace(',', '.').replace(/\s/g, ''));
    if (!Number.isFinite(a) || a <= 0) {
        throw new Error(`invalid amount: ${amount}`);
    }
    return a.toFixed(2);
}

// symbols (VS/SS/KS) are up to 10 digits
function symbol(name, value) {
    const v = String(value).trim();
    if (!/^\d{1,10}$/.test(v)) {
        throw new Error(`invalid ${name}: ${value}`);
    }
    return v;
}

// message normalization matching paylibo: strip diacritics, uppercase,
// drop the '*' field separator and control chars, cap at 60 chars
function normalizeMsg(s) {
    return String(s).normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[*\x00-\x1f]/g, '')
        .trim()
        .slice(0, 60);
}

// build the SPAYD string from form params
// ({accountPrefix, accountNumber, bankCode, amount, vs, ss, ks, message});
// empty fields are omitted, field order matches paylibo output
export function spayd(params) {
    // present-and-non-empty, so falsy-but-provided values like numeric 0
    // go through validation instead of being silently dropped
    const provided = (v) => v != null && v !== '';

    const fields = [
        ['ACC', czIban(params.accountPrefix, params.accountNumber, params.bankCode)],
    ];
    if (provided(params.amount)) fields.push(['AM', formatAmount(params.amount)]);
    fields.push(['CC', 'CZK']);
    if (provided(params.message)) fields.push(['MSG', normalizeMsg(params.message)]);
    if (provided(params.ks)) fields.push(['X-KS', symbol('ks', params.ks)]);
    if (provided(params.vs)) fields.push(['X-VS', symbol('vs', params.vs)]);
    if (provided(params.ss)) fields.push(['X-SS', symbol('ss', params.ss)]);
    return 'SPD*1.0*' + fields.map(([k, v]) => `${k}:${v}`).join('*');
}
