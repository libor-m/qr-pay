wget http://www.cnb.cz/cs/platebni_styk/ucty_kody_bank/download/kody_bank_CR.csv

OF=extension/banks.js
echo "var banks = {" > $OF
<kody_bank_CR.csv tail -n +2 |
    awk -F';' '{ print "\t\"" $1 "\": \"" $2 "\"," }'\
>> $OF
echo "};" >> $OF

# hand edit the file to remove the last comma