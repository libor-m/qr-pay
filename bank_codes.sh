wget http://www.cnb.cz/cs/platebni_styk/ucty_kody_bank/download/kody_bank_CR.csv

OF=banks.js
echo "var banks = {" >> $OF
<kody_bank_CR.csv tail -n +2 |
    awk -F';' '{ print "\"" $1 "\": \"" $2 "\"," }'\
>> $OF
echo "};" >> $OF