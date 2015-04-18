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
    var acc_re = /(\d{1,6})-(\d{10})\/(\d{4})/g;
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
        .map(function(e) {return e[1]})
        .map(function(e) { return {"ks": e} });

    // amount (pick highest amount)
    var amount_re = /([1-9][0-9 ,.]+) +(?=CZK|KC|KČ)/gi;
    var amounts = extractAll(s, amount_re)
        .map(function(e) {return e[1].replace(",", ".").replace(" ", "");})
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

// image testing url:
// https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=222885&bankCode=5500&amount=250.00&currency=CZK&vs=333&message=FOND%20HUMANITY%20CCK
function displayQR(params) {
    // create the img element
    var img = document.createElement("IMG");
    var params = {
        "accountNumber": 222885,
        "bankCode": 5500,
        "amount": 250.00,
        "currency": "CZK",
        "vs": 333,
        "message": "FOND HUMANITY CCK"
    };
    img.src = qr_api + obj2uri(params);

    // insert it into the prepared div
    var qrdiv = document.getElementById("qr");
    qrdiv.appendChild(img)
}

function fillForm(id, val) {
    var e = document.getElementById(id);
    e.value = val;
}

// the main worker
// - extract all possible the details
// - display them in form
// - let the user select (TODO)
// - display QR with chosen data
function processText(msg) {
    vals = extractDetails(msg);

    fillForm("to", vals.accounts[0].accountPrefix + '-' + vals.accounts[0].accountNumber + '/' + vals.accounts[0].bankCode);
    fillForm("bank", banks[vals.accounts[0].bankCode]);
    fillForm("amount", vals.amounts[0].amount);
    if(vals.vsymbols.length > 0) { 
        fillForm("vs", vals.vsymbols[0].vs)
    }
    if(vals.ssymbols.length > 0) { 
        fillForm("ss", vals.ssymbols[0].ss)
    }
    if(vals.ksymbols.length > 0) { 
        fillForm("ks", vals.ksymbols[0].ks)
    }
}

// add listener for the selection text
chrome.runtime.onMessage.addListener(processText);

// inject the script
chrome.tabs.executeScript(null, {file:"injected.js"});
