import test from 'node:test';
import assert from 'node:assert/strict';
import { czIban, spayd } from './spayd.js';

test('czIban known accounts', () => {
    // verified against paylibo generator output
    assert.equal(czIban('19', '2000145399', '0800'), 'CZ6508000000192000145399');
    assert.equal(czIban('0', '222885', '5500'), 'CZ1355000000000000222885');
});

test('czIban pads short prefix and number', () => {
    assert.equal(czIban('', '222885', '5500'), czIban('0', '0000222885', '5500'));
});

test('czIban rejects invalid input', () => {
    assert.throws(() => czIban('0', '', '5500'));
    assert.throws(() => czIban('0', '12345678901', '5500')); // 11 digits
    assert.throws(() => czIban('0', '222885', '55'));        // short bank code
    assert.throws(() => czIban('x', '222885', '5500'));      // non-numeric
});

// fixtures captured from
// https://api.paylibo.com/paylibo/generator/czech/string on 2026-07-09
test('spayd matches paylibo: prefixed account, vs', () => {
    assert.equal(
        spayd({ accountPrefix: '19', accountNumber: '2000145399', bankCode: '0800',
                amount: '100.00', vs: '123' }),
        'SPD*1.0*ACC:CZ6508000000192000145399*AM:100.00*CC:CZK*X-VS:123');
});

test('spayd matches paylibo: message', () => {
    assert.equal(
        spayd({ accountPrefix: '0', accountNumber: '222885', bankCode: '5500',
                amount: '250.00', vs: '333', message: 'FOND HUMANITY CCK' }),
        'SPD*1.0*ACC:CZ1355000000000000222885*AM:250.00*CC:CZK*MSG:FOND HUMANITY CCK*X-VS:333');
});

test('spayd matches paylibo: all symbols, diacritics in message', () => {
    assert.equal(
        spayd({ accountPrefix: '0', accountNumber: '222885', bankCode: '5500',
                amount: '1234.56', vs: '1234567890', ss: '555', ks: '308',
                message: 'Zpráva příjemci' }),
        'SPD*1.0*ACC:CZ1355000000000000222885*AM:1234.56*CC:CZK*MSG:ZPRAVA PRIJEMCI*X-KS:308*X-VS:1234567890*X-SS:555');
});

test('spayd omits empty fields', () => {
    assert.equal(
        spayd({ accountPrefix: '0', accountNumber: '222885', bankCode: '5500',
                amount: '10', vs: '', ss: undefined, message: '' }),
        'SPD*1.0*ACC:CZ1355000000000000222885*AM:10.00*CC:CZK');
});

test('spayd formats bare amounts to 2 decimals', () => {
    assert.match(spayd({ accountPrefix: '0', accountNumber: '222885',
                         bankCode: '5500', amount: '250' }), /\*AM:250\.00\*/);
    assert.match(spayd({ accountPrefix: '0', accountNumber: '222885',
                         bankCode: '5500', amount: '1250,5' }), /\*AM:1250\.50\*/);
});

test('spayd sanitizes message', () => {
    const s = spayd({ accountPrefix: '0', accountNumber: '222885', bankCode: '5500',
                      amount: '10', message: 'a*b' + 'x'.repeat(100) });
    const msg = s.match(/MSG:([^*]*)/)[1];
    assert.ok(!msg.includes('*'));
    assert.equal(msg.length, 60);
    assert.ok(msg.startsWith('ABX'));
});

test('spayd validates falsy-but-provided values instead of dropping them', () => {
    const acc = { accountPrefix: '0', accountNumber: '222885', bankCode: '5500' };
    // numeric 0 amount is invalid and must throw, not silently omit AM
    assert.throws(() => spayd({ ...acc, amount: 0 }));
    // numeric 0 symbol is a valid value and must be encoded
    assert.match(spayd({ ...acc, amount: '10', vs: 0 }), /\*X-VS:0$/);
});

test('spayd rejects invalid values', () => {
    const acc = { accountPrefix: '0', accountNumber: '222885', bankCode: '5500' };
    assert.throws(() => spayd({ ...acc, amount: 'abc' }));
    assert.throws(() => spayd({ ...acc, amount: '-5' }));
    assert.throws(() => spayd({ ...acc, amount: '10', vs: '12345678901' }));
    assert.throws(() => spayd({ ...acc, amount: '10', ks: '1a' }));
});
