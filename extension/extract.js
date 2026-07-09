// payment detail extraction from freeform text (email bodies etc.)
// pure functions, no DOM - tested in extract.test.js

import { banks } from './banks.js';

// extract all matches of a global regex
const extractAll = (s, re) => [...s.matchAll(re)];

// vyhlaska 169/2011 Sb.
// http://www.zlatakoruna.info/zpravy/ucty/cislo-uctu-v-cr
// checksum with digit weights applied from the last digit backwards,
// valid when the weighted sum is divisible by 11
const mod11 = (s) => {
    const tab = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
    const sum = s.split('')
        .reverse()
        .map((x, i) => tab[i] * parseInt(x, 10))
        .reduce((a, b) => a + b, 0);
    return sum % 11 == 0;
};

// return true if the account number looks valid;
// '0000' is the placeholder for accounts extracted without a bank code
export const validateAcc = (pfx, num, bank) =>
    mod11(pfx) && mod11(num) && (bank == '0000' || bank in banks);

// try to pick all valid account numbers in the text,
// most complete (and thus most confident) forms first
export function extractAccounts(s) {
    const acc_re = /(\d{1,6})-(\d{6,10})\/(\d{4})/g;   // prefix-number/bank
    const acc0_re = /[^-](\d{6,10})\/(\d{4})/g;        // number/bank
    const acc1_re = /(\d{1,6})-(\d{6,10})[^0-9]/g;     // prefix-number
    const acc2_re = /[^-](\d{6,10})/g;                 // bare number

    const candidates = [
        ...extractAll(s, acc_re).map((m) => [m[1], m[2], m[3]]),
        ...extractAll(s, acc0_re).map((m) => ['0', m[1], m[2]]),
        ...extractAll(s, acc1_re).map((m) => [m[1], m[2], '0000']),
        ...extractAll(s, acc2_re).map((m) => ['0', m[1], '0000']),
    ];

    return candidates
        .filter(([pfx, num, bank]) => validateAcc(pfx, num, bank))
        .map(([accountPrefix, accountNumber, bankCode]) =>
            ({ accountPrefix, accountNumber, bankCode }));
}

// try to extract all payment details from given text;
// accounts are objects, everything else plain strings
export function extractDetails(s) {
    const symbol = (re) => extractAll(s, re).map((m) => m[1]);

    // amount: prefer explicitly denominated (xx CZK, xx Kc, xx,-)
    const amount_re = /([1-9][0-9\s,.]+)\s+(?=CZK|KC|KČ)/gi;
    const amount2_re = /([1-9][0-9\s]+)(?=,-)/g;
    const amounts = [...extractAll(s, amount_re), ...extractAll(s, amount2_re)]
        .map((m) => m[1].replace(',', '.').replace(/\s/g, ''));

    return {
        accounts: extractAccounts(s),
        amounts,
        vsymbols: symbol(/vari\D+(\d+)/gi),
        ssymbols: symbol(/spec\D+(\d+)/gi),
        ksymbols: symbol(/konst\D+(\d+)/gi),
    };
}

// account object -> 'prefix-number/bank' display string
export const accountStr = ({ accountPrefix, accountNumber, bankCode }) =>
    (accountPrefix == '0' ? '' : accountPrefix + '-')
        + accountNumber + '/' + bankCode;

// split a form account string into prefix, number and bank
export function parseAccount(s) {
    // always prepend a prefix and anchor the match at the end of the string,
    // so we get the real prefix if it's there and '0' if there was none
    const match = /(\d{1,6})-(\d{6,10})\/(\d{4})$/.exec('0-' + s);
    if (!match) return {};
    return {
        accountPrefix: match[1],
        accountNumber: match[2],
        bankCode: match[3],
    };
}
