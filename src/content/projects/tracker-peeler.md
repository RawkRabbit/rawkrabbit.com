---
name: Tracker Peeler
tagline: Peel the tracking junk off a link before you share it.
kind: Chrome extension
platform: Chrome and other Chromium browsers (desktop)
status: live
statusNote: Free download. You load it yourself in about a minute; it isn't in the Chrome Web Store.
problem: Links pick up tracking tags, redirect wrappers and long Amazon tails, and copying a clean link by hand means picking through the address bar.
forWho: Anyone who shares links and wants them short, clean and free of tracking.
price: Free
license: Open source (MIT)
started: 2026-07-09
updated: 2026-10-08
order: 4
links:
  - label: Download Tracker Peeler
    url: https://github.com/RawkRabbit/url-tracker-peeler/releases/latest/download/tracker-peeler.zip
    primary: true
  - label: View the code on GitHub
    url: https://github.com/RawkRabbit/url-tracker-peeler
---

## What it does

Click the icon, or press Command+Shift+U (Ctrl+Shift+U on Windows), and the current tab's link is cleaned and copied to your clipboard. Right-click any link on a page and choose **Copy clean link** to do the same for that link.

- **Strips tracking tags:** utm tags, Facebook and Google click IDs, email marketing IDs and more. Everything else in the link stays exactly as it was.
- **Unwraps redirects:** Google, Facebook, Instagram, LinkedIn, Slack, YouTube, Reddit and others wrap outbound links. Tracker Peeler pulls out the real destination.
- **Shortens Amazon links:** product pages become amazon.com/dp/ plus the product ID.
- **Shows what it did:** the icon flashes a green count of what it removed, or a grey 0 if the link was already clean.

It sends nothing anywhere. No servers, no analytics, and no access to the content of the sites you visit.

## Install

1. Download the zip and unzip it.
2. Open chrome://extensions in Chrome and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped folder.

Updates are manual: download the new zip, replace the folder, and click reload on the extension's card.

## What's next

- **More trackers:** new tags get added as they turn up. Spot one it misses? Open an issue on GitHub.
