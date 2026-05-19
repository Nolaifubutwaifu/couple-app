# Twosome — App Store Submission Kit

This document is everything you need to type/upload into App Store Connect.
Open it side-by-side with the submission form.

---

## 1. App Information

| Field | Value |
|---|---|
| **App Name** | Twosome |
| **Subtitle** (30 chars) | Your little space for two |
| **Primary Category** | Lifestyle |
| **Secondary Category** | Social Networking |
| **Bundle ID** | (already set in Xcode) |
| **SKU** | twosome-ios-01 |
| **Age Rating** | 12+ (mild romantic themes, user-generated content) |
| **Content Rights** | Does not contain third-party content |

### Localizations
Start with **English (U.S.)** only for v1. Add more after launch.

---

## 2. App Store Listing

### Promotional Text (170 chars — can be updated without resubmission)
```
A cozy private space just for the two of you. Daily prompts, shared moments, mini-games, and date nights — all in one warm little app made for couples.
```

### Description (4000 chars)
```
Twosome is a private app built for just two people — you and your partner.

Whether you live together or in different cities, Twosome gives you a warm, soft place online that belongs only to the two of you. No followers. No feeds. No noise. Just one shared space where your relationship gets the attention it deserves.

WHAT YOU CAN DO TOGETHER

• Answer Daily Prompts — A new question every day, designed to help you learn something new about each other. Answers stay hidden until you've both replied.

• Capture Moments — Quick notes, photos, and mood snapshots from your day. Your own private timeline of little things.

• Chat — Private messages between just the two of you, organized by prompt and topic.

• Play Together — Tic-tac-toe and memory matching, with live presence so you know when your partner is online.

• Plan Date Nights — Curated date themes, dice rolls for spontaneous ideas, and a shared schedule.

• Voice & Video Calls — Quick, private calls without leaving the app.

• Track Your Streak — Hearts and milestones for the days you both show up.

• Customize Your Space — Avatars, accent themes, and unlockable bonus content (never gates core features).

DESIGNED FOR REAL COUPLES

Twosome was made for long-term couples, long-distance relationships, and anyone who wants a quieter, more intentional way to stay close. The design is warm, soft, and free of the dopamine traps that fill most apps. No infinite scroll, no public profiles, no algorithm.

PRIVACY, FIRST

Your messages, photos, and moments are only visible to you and your partner. We don't sell data. We don't show ads. Account deletion is one tap and is final.

GETTING STARTED

1. Create your account
2. Share your invite code with your partner
3. They join — and your shared space begins

Made with care for the two of you.
```

### Keywords (100 chars total, comma-separated)
```
couple,relationship,partner,love,date,long distance,boyfriend,girlfriend,romance,shared,private
```

### Support URL
```
https://yourdomain.com/support
```
(Replace with your real support page. Can be a simple Notion or static page with a contact email.)

### Marketing URL (optional)
```
https://yourdomain.com
```

### Privacy Policy URL (REQUIRED)
```
https://yourdomain.com/privacy
```
(You already have `public/privacy.html` — host it.)

### Copyright
```
© 2026 [Your name or company]
```

---

## 3. Privacy Nutrition Label

In App Store Connect → App Privacy, declare each item below.

### Data Collected & Linked to User

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Email Address** | Yes | Yes | No | Account auth |
| **Name** (display name) | Yes | Yes | No | App functionality |
| **Photos** (user uploads) | Yes | Yes | No | App functionality |
| **User Content** (messages, prompts, moments) | Yes | Yes | No | App functionality |
| **User ID** (Supabase UUID) | Yes | Yes | No | App functionality |
| **Coarse Location** | No | — | — | — |
| **Precise Location** | No | — | — | — |
| **Audio Data** (voice calls) | No (peer-to-peer, not stored) | — | — | — |
| **Video Data** (video calls) | No (peer-to-peer, not stored) | — | — | — |
| **Crash Data** | No | — | — | — |
| **Performance Data** | No | — | — | — |
| **Diagnostics** | No | — | — | — |
| **Advertising Data** | No | — | — | — |
| **Purchase History** | No | — | — | — |

### Data NOT Collected
- Health & Fitness
- Financial Info
- Browsing History
- Search History
- Identifiers (advertising, device)
- Contacts
- Sensitive Info

### Tracking
- **App tracks user across other apps/websites? NO**

---

## 4. App Review Information

| Field | Value |
|---|---|
| **First Name** | (your first name) |
| **Last Name** | (your last name) |
| **Phone** | (your number, for emergencies only) |
| **Email** | (your email) |
| **Sign-In Required** | YES |
| **Demo Account — username** | `appreview+demo@twosome.app` (create this) |
| **Demo Account — password** | (set a long random password — store in 1Password) |
| **Demo Notes** | See "Notes" below |

### Notes for Reviewer (5000 chars)
```
Twosome is a private app for two people in a relationship.

DEMO ACCOUNT
The provided demo account is already paired with a "demo partner" account so you can see the full two-person experience without needing a second device.

After signing in, you will land directly in the main experience with messages, moments, and date-night content pre-populated. Please tap each of the 5 bottom tabs to see all functionality.

TWO-PERSON FEATURES
- All chat, prompts, moments, and games require two paired users. The demo account is pre-paired so this works out of the box.
- If you want to test the pairing flow yourself, you can create a fresh account and use the invite code feature — but the pre-paired demo is faster.

CONTENT MODERATION
- All user-generated content (messages, photos, moments) is private to a 2-person couple. There is no public feed.
- Users can block/report and delete their account at any time from More → Settings.
- We respond to abuse reports within 24 hours via the in-app contact form.

PERMISSIONS
- Camera + Photo Library: only triggered when user taps "share a photo".
- Microphone: only triggered when user starts a voice/video call.
- Notifications: optional, prompted on first launch.

Thank you for reviewing.
```

---

## 5. Screenshots Required

You need **5–10 screenshots** for each device size. iOS requires:

| Device class | Resolution | Required? |
|---|---|---|
| **6.9" iPhone** (16 Pro Max, 17 Pro Max) | 1320 × 2868 | YES |
| **6.7" iPhone** (older Pro Max) | 1290 × 2796 | usually required |
| **6.5" iPhone** (Plus / XS Max) | 1242 × 2688 | usually required |
| **iPad Pro 13"** | 2064 × 2752 | if iPad build |

### Screenshot script (suggested 6)
1. **Home / Today** — greeting + couple stats + daily prompts visible
2. **Chat / Prompt thread** — shows revealed prompt answers in chat
3. **Moments timeline** — photos + mood snapshots from a day
4. **Date Night** — theme picker / dice roll
5. **Games** — tic-tac-toe in mid-play
6. **More / Customization** — shop / streak hearts / avatar

Capture them from a real device or simulator after seeding the demo couple with realistic content. Pixel-perfect frames help conversion — consider running them through a tool like ScreenshotAlchemy or Previewed for marketing polish.

---

## 6. App Preview Video (Optional but high-impact)

A 15–30 sec video that shows the app in motion. Even a simple screen recording with light music dramatically lifts install rates. Capture from the iPhone simulator with QuickTime → File → New Movie Recording.

---

## 7. Pre-Submission Checklist

Before tapping "Submit for Review":

- [ ] App icon shows the otter logo on all sizes (not the Capacitor placeholder)
- [ ] Launch screen shows branded splash, not a flash of white/blue
- [ ] Test on a real device with `--release` configuration
- [ ] All `NS*UsageDescription` strings in `Info.plist` are clear, friendly, and explain *why*
- [ ] App handles airplane-mode gracefully (offline banner appears)
- [ ] User can delete their account from inside the app (App Store hard requirement since 2022)
- [ ] User can block / report a partner (UGC apps require this)
- [ ] Privacy Policy is publicly hosted at the URL you submitted
- [ ] Demo account works end-to-end with no errors
- [ ] Crash-free on cold launch on iPhone SE (smallest current device) and iPhone Pro Max
- [ ] Tap targets ≥ 44pt everywhere
- [ ] Push notification permission prompt has clear context (or removed entirely if not used)
- [ ] No console errors in WebView in production build
- [ ] `MARKETING_VERSION` (1.0.0) and `CURRENT_PROJECT_VERSION` (1) set in Xcode → Build Settings
- [ ] `ITSAppUsesNonExemptEncryption` = false (already in Info.plist ✓)
- [ ] You have a paid Apple Developer account ($99/yr) and an App Store Connect record created

---

## 8. After Submission

- Initial review usually completes in 24–48 hours
- If rejected, the resolution center email tells you exactly what to fix
- Common first-time rejections: missing demo account, missing account deletion, vague usage strings, broken signup flow
- You can reply to the reviewer in the resolution center with clarifications

Good luck.
