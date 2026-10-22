# Orbe Pay

<img src="icon-512.png" width="96" alt="Orbe Pay logo">

A one-page payment request app for UPI. Type the amount, pick which account to collect into, and show the customer a QR with the amount already filled in. They scan it with GPay, PhonePe, Paytm, BHIM or any UPI app and just approve.

## Features

- Black glass-and-gold design with an on-screen amount keypad
- Multiple QRs: save several UPI IDs (shop counter, wholesale, personal) as metal cards and switch with one tap
- Amount and an optional note are built into the QR
- Swipe the QR card to switch between saved QRs
- Full-screen mode for the counter
- Share QR: sends a ready-made payment card image to WhatsApp or any app
- Works on any phone browser

## Use it

Open `index.html` in a browser, or turn on GitHub Pages for this repo (Settings → Pages → Deploy from branch → `main` / root).

Replace the two sample UPI IDs with your own using **Edit QR** before collecting money. After adding a UPI ID, pay ₹1 to it from another phone to check it reaches the right account.

## Privacy

Saved UPI IDs are kept only in your browser's local storage on that device. Nothing is sent to a server. The app doesn't process or confirm payments, so always check incoming payments in your own bank or UPI app.

## Android app (APK)

Every push to `main` builds `OrbePay.apk` with GitHub Actions and attaches it to the latest release on the [Releases page](../../releases/latest). On your phone, download the APK, open it, and allow "Install unknown apps" for your browser when asked.

The APK works offline (the QR library is bundled), keeps the screen on in full-screen mode, and **Share QR** sends a payment card image (QR, amount, your name, UPI ID) to WhatsApp or any app.
