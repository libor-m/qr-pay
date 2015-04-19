// this is called when the popup is invoked
// it registers a callback and then injects a script into 
// current active tab
// the injected script grabs the selected text and sends it back 
// to the popup as a message

// mix of information in 
// http://qr-platba.cz/pro-vyvojare/restful-api/
// and 
// http://qr-platba.cz/pro-vyvojare/restful-api/#generator-czech-image
// was used - the information is not always correct
var qr_api = "https://api.paylibo.com/paylibo/generator/czech/image?"

// 'deep compare' - compare all values for all keys
// of a and b
// http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
// modified to my needs
// still trying to avoid lodash;)
function objEquals(x, y) {
  if ( x === y ) return true;
    // if both x and y are null or undefined and exactly the same

  if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
    // if they are not strictly equal, they both need to be Objects

  if ( x.constructor !== y.constructor ) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

  for ( var p in x ) {
    if ( ! x.hasOwnProperty( p ) ) continue;
      // other properties were tested using x.constructor === y.constructor

    if ( ! y.hasOwnProperty( p ) ) return false;
      // allows to compare x[ p ] and y[ p ] when set to undefined

    if ( x[ p ] === y[ p ] ) continue;
      // if they have the same strict value or identity then they are equal

    return false;
  }

  for ( p in y ) {
    if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) return false;
      // allows x[ p ] to be set to undefined
  }
  return true;
}

// encode key-value pairs in object into uri 'GET' string
function obj2uri(obj) {
    return Object.keys(obj).map(
        function(k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
        }).join('&');
}

// extract all matches of given 'g' regular
// into an array
function extractAll(s, re) {
    var res = [];
    while (match = re.exec(s)) {
        res.push(match)
    }
    return res;
}

// vyhlaska 169/2011 Sb.
// http://www.zlatakoruna.info/zpravy/ucty/cislo-uctu-v-cr
// http://www.penize.cz/bezne-ucty/15470-tajemstvi-cisla-uctu
// validace (prefix a core): 
// ABCDEFGHIJ
//         19
// 3321280297
// S = J*1 + I*2 + H*4 + G*8 + F*5 + E*10 + D*9 + C*7 + B*3 + A*6
// S == 0 MOD 11
// validace kodu bank
// http://www.cnb.cz/cs/platebni_styk/ucty_kody_bank/
// return true if account number looks valid
function validateAcc(pfx, num, bank) {
    // checks the mod11 criterion
    function mod11(s) {
        tab = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
        var sum = s.split('')
            .reverse()
            .map(function(x) {return parseInt(x)})
            .map(function(x, i) {return tab[i] * x})
            .reduce(function(a, b) {return a + b;})

        return ( sum % 11 ) == 0;
    }

    // TODO enable after testing
    return mod11(pfx) && mod11(num); // && (bank in banks);
}

// try to pick all valid account numbers in the text
function extractAccounts(s) {
    // prefixed form
    // 19-3321280297/0100 
    // or 3321280297/0100
    // due to the mod11 validation, there is no valid 1 number prefix
    // except for 0
    var acc_re = /(\d{1,6})-(\d{6,10})\/(\d{4})/g;
    var acc0_re = /[^-](\d{10})\/(\d{4})/g;

    // extract all prefixed numbers
    // and append all non-prefixed numbers, setting prefix to '0'
    // then pick only 'valid' account numbers
    var accs = extractAll(s, acc_re)
        .concat(extractAll(s, acc0_re)
                .map(function(e) {e.splice(1, 0, '0'); return e;}))
        .filter(function(e) {return validateAcc(e[1], e[2], e[3]);});

    // reformat the list
    return accs.map(function(e) { return {"accountPrefix": e[1], "accountNumber": e[2], "bankCode": e[3]}; })
}

// try to extract payment details
// from given text
function extractDetails(s) {
    // accounts
    var accs = extractAccounts(s);

    // 'variabilni symbol'
    var vs_re = /vari\D+(\d+)/gi;
    var vss = extractAll(s, vs_re)
        .map(function(e) { return e[1] })
        .map(function(e) { return {"vs": e} });

    // 'specificky symbol'
    var ss_re = /spec\D+(\d+)/gi;
    var sss = extractAll(s, ss_re)
        .map(function(e) { return e[1] })
        .map(function(e) { return {"ss": e} });

    // 'konstantni symbol'
    var ks_re = /konst\D+(\d+)/gi;
    var kss = extractAll(s, ks_re)
        .map(function(e) { return e[1] })
        .map(function(e) { return {"ks": e} });

    // amount (pick highest amount)
    var amount_re = /([1-9][0-9 ,.]+) +(?=CZK|KC|KČ)/gi;
    var amount2_re = /([1-9][0-9 ]+)(?=,-)/g;

    var amounts = extractAll(s, amount_re)
        .concat(extractAll(s, amount2_re))
        .map(function(e) { return e[1].replace(",", ".").replace(" ", "") })
        .map(function(e) { return {"amount": e} });

    // due date (pick latest date)
    // not necessary for the payment
    //var date_re = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
    return {
        "accounts": accs,
        "amounts": amounts,
        "vsymbols": vss,
        "ssymbols": sss,
        "ksymbols": kss
    }
}

function fillForm(id, val) {
    var e = document.getElementById(id);
    e.value = val;
}

// convert account object to string
function accountStr(o) {
    if (o.accountPrefix == '0') {
        return o.accountNumber + '/' + o.bankCode;
    }
    return o.accountPrefix + '-' + o.accountNumber + '/' + o.bankCode;
}

// max of an array
function arrayMax(arr) {
  return arr.reduce(function (p, v) {
    return ( p > v ? p : v );
  });
}

// modify object o by adding attributes from other
// updating confilcting values to values from other
function update(o, other) {
    for (k in other) {
        o[k] = other[k]
    }
}
// the main worker
// - extract all possible the details
// - display them in form
// - let the user select (TODO)
function processText(msg) {
    // extract all possible payment details
    var vals = extractDetails(msg);

    // TODO: use datalist with all acceptable values
    // sorted by preference
    // http://stackoverflow.com/questions/14614702/html-combo-box-with-option-to-type-an-entry

    // prefer ceska sporitelna (after all it's my tool;)
    // then any
    if (vals.accounts.length > 0) {
        var cs = vals.accounts.filter(function(e) {return e.bankCode == '0800';});
        var chosenAcc = vals.accounts[0];
        if (cs.length > 0) {
            chosenAcc = cs[0];
        }

        fillForm("to", accountStr(chosenAcc));

        // bank is 'read only', only for control
        fillForm("bank", banks[chosenAcc.bankCode]);
    }

    // prefer higher values from more reliable extractors (xx czk; xx kc; xx,-)
    // then all numbers
    if (vals.amounts.length > 0) {
        fillForm("amount", vals.amounts[0].amount);
    }
    if (vals.vsymbols.length > 0) { 
        fillForm("vs", vals.vsymbols[0].vs);
    }
    if (vals.ssymbols.length > 0) { 
        fillForm("ss", vals.ssymbols[0].ss);
    }
    if (vals.ksymbols.length > 0) { 
        fillForm("ks", vals.ksymbols[0].ks);
    }

    // TODO: add custom messages (sender id and recipient message)
}

// collect values from the form into params object
function collectParams() {
    function getVal(id) {
        var e = document.getElementById(id);
        return e.value;
    }
    // split the account into prefix, num and bank
    function parseAccount(s) {
        // allways add prefix, and anchor the match to the end of the string
        // so we get the right prefix if it's there
        // and '0' if there was no prefix
        var spfx = '0-' + s;
        var acc_re = /(\d{1,6})-(\d{6,10})\/(\d{4})$/;
        var match = acc_re.exec(spfx);
        if(match) {
            return {
                "accountPrefix": match[1],
                "accountNumber": match[2],
                "bankCode": match[3]
            };
        }
        return {};
    }

    // retrieves values for given fields 
    // and returns them in {"field": getVal("field")}
    function multiGet(names) {
        return names.reduce(function(acc, x){
            acc[x] = getVal(x); return acc;
        }, {});
    }
    var res = parseAccount(getVal("to"));
    // looks like CS neither paylibo api nor CS does interpret
    // the 'identifier' respectively 'X-ID' spayd field ;(
    update(res, multiGet(["amount", "vs", "ss", "ks", "message"]))
    return res;
}

// image testing url:
// https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=222885&bankCode=5500&amount=250.00&currency=CZK&vs=333&message=FOND%20HUMANITY%20CCK
// TODO: looks like it's a simple spayd encoded in any QR, so we can avoid the api in the future
// http://davidshimjs.github.io/qrcodejs/
// would have to write own spayd encoder..
function displayQR(params) {
    // set the source
    var img = document.getElementById("qr_img");
    if(params.accountNumber && params.amount) {
        img.src = qr_api + obj2uri(params);
    } else {
        img.src = 'img/empty-qr.png';
    }
}

// updates the qr if necessary
// runs periodically, instead of juggling with onblur and onchange events
qr_params = {};
function ticker() {
    var params = collectParams();
    if(!objEquals(params, qr_params)) {
        qr_params = params;
        displayQR(qr_params);
    }
}

// add value checker
window.setInterval(ticker, 500);

// add listener for the selection text
chrome.runtime.onMessage.addListener(processText);

// inject the script
chrome.tabs.executeScript(null, {file:"injected.js"});
