import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDetails, extractAccounts, accountStr, parseAccount, validateAcc } from './extract.js';

test('typical czech invoice email', () => {
    const d = extractDetails(
        'Dobrý den,\n' +
        'zasíláme fakturu č. 2026070123.\n' +
        'K úhradě: 1 250 Kč\n' +
        'Číslo účtu: 19-2000145399/0800\n' +
        'Variabilní symbol: 2026070123\n' +
        'Konstantní symbol: 308\n');
    assert.equal(accountStr(d.accounts[0]), '19-2000145399/0800');
    assert.equal(d.amounts[0], '1250');
    assert.equal(d.vsymbols[0], '2026070123');
    assert.equal(d.ksymbols[0], '308');
});

test('amount variants', () => {
    assert.equal(extractDetails('celkem 10 000,50 CZK prosim').amounts[0], '10000.50');
    assert.equal(extractDetails('sleva! jen 350,- za kus').amounts[0], '350');
});

test('account without bank code gets the 0000 placeholder', () => {
    const accs = extractAccounts('platba na ucet 19-2000145399, dekujeme');
    assert.equal(accs[0].bankCode, '0000');
    assert.equal(accountStr(accs[0]), '19-2000145399/0000');
});

test('account at the very start of the text is found', () => {
    // all forms, with no preceding character available to consume
    assert.equal(accountStr(extractAccounts('222885/5500 je nas ucet')[0]),
        '222885/5500');
    assert.equal(accountStr(extractAccounts('19-2000145399/0800 je nas ucet')[0]),
        '19-2000145399/0800');
    assert.equal(accountStr(extractAccounts('2000145399 je nas ucet')[0]),
        '2000145399/0000');
    // and the whole text being just the account
    assert.equal(accountStr(extractAccounts('222885/5500')[0]), '222885/5500');
});

test('prefixed account number is not re-matched without its prefix', () => {
    // the lookbehind keeps the number right after '19-' from
    // also matching as a standalone bank-less account
    const accs = extractAccounts('ucet 19-2000145399/0800');
    assert.ok(!accs.some((a) => a.accountPrefix === '0'
        && a.accountNumber === '2000145399'));
});

test('confidence order: full account form comes first', () => {
    const accs = extractAccounts('ucty 19-2000145399/0800 nebo 222885/5500');
    assert.equal(accountStr(accs[0]), '19-2000145399/0800');
    // the same accounts are also re-found by the weaker patterns
    assert.ok(accs.some((a) => accountStr(a) == '222885/5500'));
});

test('mod11 rejects mistyped account, unknown bank code rejected', () => {
    assert.equal(extractAccounts('ucet 19-2000145398/0800').length, 0);
    assert.equal(validateAcc('0', '222885', '9999'), false);
    assert.equal(validateAcc('0', '222885', '5500'), true);
});

test('parseAccount round-trips form input', () => {
    assert.deepEqual(parseAccount('19-2000145399/0800'),
        { accountPrefix: '19', accountNumber: '2000145399', bankCode: '0800' });
    assert.deepEqual(parseAccount('222885/5500'),
        { accountPrefix: '0', accountNumber: '222885', bankCode: '5500' });
    assert.deepEqual(parseAccount('not an account'), {});
});

test('no details in unrelated text', () => {
    const d = extractDetails('Ahoj, sejdeme se v 18:30 u kina? Petr');
    assert.equal(d.accounts.length, 0);
    assert.equal(d.amounts.length, 0);
    assert.equal(d.vsymbols.length, 0);
});
