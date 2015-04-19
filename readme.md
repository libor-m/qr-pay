# QR Pay
QR Pay is a chrome extension that tries to extract payment information from
selected text and displays it in a QR code according to http://qr-platba.cz/.

Just select text in your email and click QR Pay to get the QR code to pay the amount.
Written (only) for Czech Republic banking system wire transfers.

## TODO
- self hosted qr code rendering (needs custom SPAYD encoder, there are QR rendering libraries)
- show all available strings for all fields (needs either fixing of chrome's datalist bug
  or some jQuery substitution of combo-box)
- find out if it is possible to encode 'message for self' in the spayd
- validation for freeform input