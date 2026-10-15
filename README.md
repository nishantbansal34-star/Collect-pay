# Collect Pay

A one-page payment request app for UPI. Type the amount, pick which account to collect into, and show the customer a QR with the amount already filled in. They scan it with GPay, PhonePe, Paytm, BHIM or any UPI app and just approve.

## Features

- Multiple QRs: save several UPI IDs (shop counter, wholesale, personal) and switch with one tap
- Amount and an optional note are built into the QR
- Full-screen "Show to customer" mode
- Copy a UPI pay link to send on WhatsApp
- Works in light and dark mode, on any phone browser

## Use it

Open `index.html` in a browser, or turn on GitHub Pages for this repo (Settings → Pages → Deploy from branch → `main` / root).

Replace the two sample UPI IDs with your own using **Edit QR** before collecting money. After adding a UPI ID, pay ₹1 to it from another phone to check it reaches the right account.

## Privacy

Saved UPI IDs are kept only in your browser's local storage on that device. Nothing is sent to a server. The app doesn't process or confirm payments, so always check incoming payments in your own bank or UPI app.
