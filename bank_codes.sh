#!/bin/sh
# refresh the Czech bank code list from CNB and regenerate extension/banks.js
# landing page (if the download path moves again):
# https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/
set -e

wget -q -O kody_bank_CR.csv 'https://www.cnb.cz/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.csv'

OF=extension/banks.js
{
    echo "export const banks = {"
    # strip CRs and skip the header (which also drops the BOM);
    # columns: code;provider;BIC;CERTIS
    tr -d '\r' < kody_bank_CR.csv |
        tail -n +2 |
        awk -F';' '{ gsub(/^ +| +$/, "", $2); print "\t\"" $1 "\": \"" $2 "\"," }'
    echo "};"
} > "$OF"
