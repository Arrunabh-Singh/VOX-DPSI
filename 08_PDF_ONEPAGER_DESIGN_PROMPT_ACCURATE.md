# Claude Design Prompt — Vox DPSI Meeting Request One-Pager
**Extracted from live source: https://vox-dpsi.vercel.app**
**Design tokens pulled directly from `index.css`, `constants.js`, `tailwind.config.js`, and component source.**

---

## WHAT YOU ARE BUILDING

A single A4 page PDF (portrait, 210mm × 297mm, 300 DPI) that Arrunabh Singh will attach to an email to the Principal of Delhi Public School Indore, requesting a 15-minute demonstration of Vox DPSI.

**This is a professional institutional document — not a marketing flyer. It must look like it was exported directly from the Vox DPSI application's own design system.**

**Sender:** Arrunabh Singh, Class XII B, Scholar No. 5411, House Prithvi, DPS Indore
**Recipient:** Mr. Parminder Chopra, Principal, Delhi Public School Indore
**Subject of document:** Request for 15-minute demonstration of Vox DPSI

---

## EXACT DESIGN SYSTEM (EXTRACTED FROM SOURCE)

### 1. Color Palette — ALL EXACT HEX VALUES

```
BACKGROUNDS & SURFACES
──────────────────────
Page background (parchment)   : #EAE1C4
Card / dialog background      : #FFFFFF
Secondary surface             : #F5F0E8
Login page gradient start     : #1A2E16
Login page gradient mid       : #2D5C26
Login page gradient end       : #1E3F18

BRAND GREENS (PRIMARY)
──────────────────────
Forest green — primary/nav    : #2D5C26
Deep green — hover/accents    : #1E3F18
Dark shield green             : #1B4D2B
Darkest shield inner          : #163D22

GOLD ACCENT (USE MAXIMUM 3× PER PAGE)
──────────────────────────────────────
Warm gold — primary accent    : #C9A84C
Bright gold — SVG mic arc     : #F0B429
Deep gold — mic capsule       : #C9920A
Gold light tint               : rgba(201,168,76,0.12)
Gold border                   : rgba(201,168,76,0.22)

TYPOGRAPHY
──────────────────────────────────────
Text primary                  : #1A1A1A
Text secondary / muted        : #6B7280
Text dark gray                : #374151

BORDERS & SHADOWS
──────────────────────────────────────
Card border                   : rgba(45,92,38,0.12)
Navbar bottom border          : rgba(201,168,76,0.22)
Card shadow                   : 0 2px 16px rgba(45,92,38,0.08)
Modal shadow                  : 0 24px 64px rgba(45,92,38,0.16)

SEMANTIC COLORS
──────────────────────────────────────
Success green                 : #16A34A
Warning amber                 : #D97706
Danger red                    : #DC2626
Info blue                     : #2563EB
Urgent orange                 : #EA580C
Purple (personal / appeals)   : #7C3AED
Indigo (in progress)          : #4F46E5

DOMAIN BADGE COLORS (text / background)
──────────────────────────────────────
Academics      : #2563EB / #EFF6FF
Infrastructure : #EA580C / #FFF7ED
Safety         : #DC2626 / #FEF2F2
Personal       : #7C3AED / #F5F3FF
Behaviour      : #D97706 / #FFFBEB
Other          : #6B7280 / #F9FAFB

STATUS PILL COLORS (text / background)
──────────────────────────────────────
Raised                 : #6B7280 / #F3F4F6
Verified               : #2563EB / #DBEAFE
In Progress            : #4F46E5 / #EEF2FF
Escalated → Teacher    : #EA580C / #FFEDD5
Escalated → Coord.     : #D97706 / #FEF3C7
Escalated → Principal  : #DC2626 / #FEE2E2
Resolved               : #16A34A / #DCFCE7
Appealed               : #7C3AED / #EDE9FE
Closed                 : #374151 / #E5E7EB
```

### 2. Typography Specification

```
PRIMARY FONT  : Inter (Google Fonts)
               Weights available: 300, 400, 500, 600, 700, 800, 900
               Usage: ALL body text, labels, stats, descriptions

LOGO FONT     : Outfit (Google Fonts)
               Weight: 800
               Usage: "VOX DPSI" wordmark ONLY
               Letter-spacing: -0.02em

MONO FONT     : System monospace (ui-monospace / Consolas)
               Weight: 700
               Usage: Complaint numbers (VOX-001 format)

FONT SIZES (mirroring app scale)
──────────────────────────────────────
Hero/logo text    : 64px / pt48 (in PDF: ~36pt)
Page title h1     : 24px / bold 900 — color #2D5C26
Section header h2 : 16–18px / bold 700–800 — color #1A1A1A
Body text         : 13–14px / regular 400 — color #1A1A1A
Label / caption   : 11–12px / semibold 600 — color #6B7280
Tiny label        : 10px / bold 700 / uppercase 0.08em spacing — color #6B7280
Stat number       : 36–48px / black 900 — domain-specific color
Sub-stat label    : 10px / semibold 600 / uppercase tracking — color #6B7280
```

### 3. Shape & Spacing Rules

```
Card border-radius    : 14px (standard card)
                        20px (modal / large card)
                        16px (dark glass hero card)
                        10px (button)
Pill border-radius    : 9999px (fully rounded)
Badge border-radius   : 9999px
Border width          : 1px (standard card)
                        2px (urgent / highlighted card)
Card padding          : 20px (standard)
Section gap           : 16px between cards / 12px within sections
Page margins          : minimum 12mm all sides on A4
Navbar height (ref)   : ~52px
Button padding        : 10px 20px
```

---

## THE VOX DPSI LOGO — EXACT SPECIFICATION

The logo consists of two parts placed side by side with 10px gap:

**Part 1 — VoxMark Shield (SVG):**
- Shield shape, dark green outer `#1B4D2B`, inner `#163D22`
- Microphone capsule: `#C9920A` with white highlight `rgba(255,255,255,0.25)`
- Microphone arc (pickup curve): stroke `#F0B429`, strokeWidth 1.8, round caps
- Stand vertical line: stroke `#F0B429`, strokeWidth 1.8
- Stand base line: stroke `#F0B429`, strokeWidth 1.8
- Size: ~36×40px at "md" scale, 28×31px at "sm"

**Part 2 — Wordmark:**
- Font: Outfit 800, letter-spacing -0.02em
- "VOX " — white (#FFFFFF) when on dark background, dark green (#1B4D2B) on light
- "DPSI" — always gold (#C9920A)
- No space between the two — it reads as "VOX DPSI" but VOX is white/green and DPSI is gold

**Usage on PDF:**
- On dark green backgrounds: white VOX + gold DPSI (as seen on login screen)
- On light backgrounds: dark green VOX + gold DPSI

---

## PAGE LAYOUT — SECTION BY SECTION

The page uses the **DARK THEME throughout** (matching the login screen aesthetic). No light parchment background. Use the deep green gradient as the dominant background.

### OVERALL CANVAS

```
A4 Portrait: 210mm × 297mm
Background: linear-gradient(160deg, #1A2E16 0%, #2D5C26 45%, #1E3F18 100%)
Decorative circles (subtle, like login page):
  - Top-right: 80mm circle, rgba(201,168,76,0.06)
  - Bottom-left: 60mm circle, rgba(234,225,196,0.04)
All text on dark background: white or gold
Font: Inter throughout, Outfit for logo wordmark only
```

---

### SECTION 1 — HEADER STRIP (top of page)

**Position:** Full width, top 12mm, height ~18mm
**Background:** rgba(0,0,0,0.25) — slightly darker than page
**Border-bottom:** 1px solid rgba(201,168,76,0.22)

**Left side:** "Delhi Public School Indore" — Inter 10px, weight 600, color rgba(255,255,255,0.7), uppercase, 0.12em spacing
**Center:** URL "vox-dpsi.vercel.app" — Inter 10px, weight 700, color #C9A84C (gold)
**Right side:** Date "1 May 2026" — Inter 10px, weight 500, color rgba(255,255,255,0.5)

---

### SECTION 2 — HERO BLOCK (logo + tagline)

**Position:** Centered, below header, ~35mm tall
**Layout:** Centered column

**Logo:**
- VoxMark shield SVG at ~40px height
- "VOX" — Outfit 800, 32pt, color #FFFFFF, letter-spacing -0.02em
- "DPSI" — Outfit 800, 32pt, color #C9920A, letter-spacing -0.02em
- Logo + wordmark side by side, centered, gap 10px

**Tagline (below logo, 8px gap):**
- "The Voice of Delhi Public School Indore"
- Inter 12px, italic, color rgba(255,255,255,0.55), centered

**Divider (below tagline, 8px gap):**
- Horizontal line pair with center text:
  - Left line: 40mm, rgba(201,168,76,0.4)
  - Center text: "STUDENT GRIEVANCE MANAGEMENT SYSTEM" — 9px, bold 700, color rgba(201,168,76,0.7), 0.15em spacing, uppercase
  - Right line: 40mm, rgba(201,168,76,0.4)

---

### SECTION 3 — TWO-COLUMN: THE PROBLEM + THE INSPIRATION

**Position:** Below hero, full width, ~36mm tall
**Layout:** Two equal columns (50/50), 8mm gap between them
**Background:** Two separate cards:
  - Left card bg: rgba(0,0,0,0.20)
  - Right card bg: rgba(201,168,76,0.07)
  - Both: border-radius 14px, padding 14px 16px

**LEFT COLUMN — "The Problem"**
- Header: "The Problem" — Inter 13px, bold 700, color #FFFFFF, margin-bottom 8px
- Small colored dot or icon left of header: #DC2626 (danger red) square 6px
- Body text (Inter 11px, weight 400, color rgba(255,255,255,0.75), line-height 1.6):
  > "At DPS Indore, student concerns disappear into verbal loops — passed from person to person with no record, no accountability, and no resolution timeline. Students stay silent because there's no safe, structured way to be heard."

**RIGHT COLUMN — "The Inspiration"**
- Header: "The Inspiration" — Inter 13px, bold 700, color #C9A84C (gold), margin-bottom 8px
- Small colored dot or icon left of header: #C9A84C square 6px
- Body text (Inter 11px, weight 400, color rgba(255,255,255,0.75), line-height 1.6):
  > "Inspired by Indore's award-winning 311 civic grievance system — India's model for transparent public accountability — Vox DPSI brings the same principle inside school walls: every concern gets a tracking number, a handler, and a timeline."

---

### SECTION 4 — PRODUCT DESCRIPTION

**Position:** Below two-column, full width, ~22mm tall
**Background:** rgba(45,92,38,0.35) — slightly lighter green card
**Border:** 1px solid rgba(201,168,76,0.15)
**Border-radius:** 14px
**Padding:** 14px 18px

**Content:**
- No header. Single paragraph, centered or left-aligned.
- Inter 12px, weight 400, color rgba(255,255,255,0.85), line-height 1.65

> **Vox DPSI** is a full-stack student grievance management platform built by the Student Council of Delhi Public School Indore. Students raise complaints with a unique tracking number (VOX-001 format), which are assigned to council members, escalated through teachers and coordinators with complete audit trails, and resolved with SLA timers enforcing accountability at every step. Anonymity controls, WhatsApp notifications, and an appeals system ensure both safety and fairness.

---

### SECTION 5 — HOW IT WORKS (6-role flow diagram)

**Position:** Below description, full width, ~28mm tall
**Section label:** "HOW IT WORKS" — Inter 9px, bold 700, uppercase, 0.15em spacing, color rgba(201,168,76,0.7), margin-bottom 8px

**Flow diagram — horizontal, centered:**

Six role nodes connected by arrows, all in a single row.

Each node is a pill/card:
- Width: ~24mm, Height: ~12mm
- Background: rgba(255,255,255,0.07)
- Border: 1px solid rgba(255,255,255,0.12)
- Border-radius: 8px
- Centered text:
  - Role icon (emoji): 14px
  - Role name: Inter 9px, bold 700, color #FFFFFF
  - Role sub: Inter 8px, color rgba(255,255,255,0.5)

**The six nodes (left to right):**
1. 📱 **Student** / Raises complaint
2. 🏛️ **Council** / Assigns & verifies  (border-left: 3px solid #16A34A)
3. 👩‍🏫 **Teacher** / Class escalation   (border-left: 3px solid #EA580C)
4. 📋 **Coordinator** / Dept. review     (border-left: 3px solid #D97706)
5. 🎓 **Principal** / Final authority    (border-left: 3px solid #DC2626)
6. 👑 **VOX-O6** / Oversees all          (border-left: 3px solid #C9A84C, gold border)

**Arrows between nodes:**
- Thin arrow → (→) in rgba(255,255,255,0.3)
- Below the Student→Council arrow, small text: "VOX-001 assigned"
- Below arrows: "SLA timers enforce each step"  — 8px, color rgba(255,255,255,0.4), centered

**VOX-O6 node** sits slightly above the others (or marked with "Oversees" arc) — it supervises all levels.

---

### SECTION 6 — KEY FEATURES (6 cards in 3×2 grid)

**Position:** Below flow diagram, full width, ~52mm tall
**Section label:** "KEY FEATURES" — same style as section 5 label, margin-bottom 8px

**Grid:** 3 columns × 2 rows, 6mm gap

Each feature card:
- Background: rgba(255,255,255,0.06)
- Border: 1px solid rgba(255,255,255,0.10)
- Border-radius: 12px
- Padding: 10px 12px
- Height: ~22mm

**Card content:**
- Icon: 18px emoji, color as specified
- Title: Inter 11px, bold 700, color #FFFFFF, margin-top 4px
- Description: Inter 9px, weight 400, color rgba(255,255,255,0.65), line-height 1.5, margin-top 3px

**The 6 feature cards:**

```
1. 🔒 Anonymity Control
   border-top: 2px solid #7C3AED
   "Students request anonymity. Council always sees the name. Identity revealed 
    to teachers/coordinators only with explicit consent — logged in audit trail."

2. ⏱️ SLA Timers
   border-top: 2px solid #D97706
   "Every complaint has a 48-hour resolution window. On Track → Due Soon → 
    Act Now → OVERDUE 🔴 — visible to all handlers in real time."

3. 📊 Analytics Dashboard
   border-top: 2px solid #2D5C26
   "Domain breakdowns, section heatmaps, resolution rates, council performance 
    scores, and 7-day complaint volume timeline — all in one view."

4. 💬 WhatsApp Notifications
   border-top: 2px solid #16A34A
   "Instant WhatsApp alerts via Twilio when complaints are assigned, escalated, 
    or resolved. No one can claim they didn't know."

5. ✅ In-Person Verification
   border-top: 2px solid #2563EB
   "Council members must mark complaints as Verified after meeting the student 
    face-to-face. No digital shortcuts — accountability built into the workflow."

6. 📜 Full Audit Trail
   border-top: 2px solid #C9A84C
   "Every action — escalation, vote, note, status change — is timestamped and 
    logged in a tamper-evident timeline. Complete institutional memory."
```

---

### SECTION 7 — STATS BAR

**Position:** Below features grid, full width, ~18mm tall
**Background:** rgba(201,168,76,0.10)
**Border:** 1px solid rgba(201,168,76,0.25)
**Border-radius:** 12px
**Padding:** 12px 20px
**Layout:** Three stat blocks side by side, separated by vertical dividers

**Stats (3 total — GOLD ACCENT USE #1, #2, #3):**

```
STAT 1:    ₹500 / month
LABEL:     Railway + Vercel hosting

STAT 2:    3 weeks
LABEL:     Built in spare time

STAT 3:    6 roles
LABEL:     Student → VOX-O6
```

**Each stat:**
- Number: Inter 28px, black 900, color #C9A84C (GOLD — this is a permitted gold use)
- Label: Inter 9px, semibold 600, uppercase, 0.08em spacing, color rgba(255,255,255,0.55)

**Vertical dividers:** 1px, rgba(201,168,76,0.25), height 60% of bar

---

### SECTION 8 — APP SCREENSHOTS (thumbnail row)

**Position:** Below stats bar, full width, ~38mm tall
**Section label:** "LIVE APPLICATION" — same label style, margin-bottom 6px

**Layout:** Three screenshot thumbnails side by side with captions
- Thumbnail size: ~56mm wide × 32mm tall
- Border-radius: 10px
- Border: 1px solid rgba(255,255,255,0.15)
- Small caption below each (Inter 8px, color rgba(255,255,255,0.5), centered)

**Screenshots to use (from vox-dpsi.vercel.app):**

> **IMPORTANT TO CLAUDE DESIGN:** Open the following URLs and capture screenshots at 1280×720 viewport:
> 1. **Login page** — https://vox-dpsi.vercel.app/login
>    Caption: "Login — 6 roles, demo accounts"
>
> 2. **Principal dashboard** — Login as principal@dpsi.com / demo123, then screenshot the complaints tab
>    Caption: "Principal Dashboard — full system view"
>
> 3. **Analytics tab** — Click Analytics tab on principal dashboard
>    Caption: "Analytics — domain breakdown + council scores"
>
> If live screenshots are unavailable, create stylized mockup thumbnails that accurately represent the green/parchment color scheme of the app. Each thumbnail should show:
> - Green navbar (#2D5C26) at top with white "VOX DPSI" text
> - Parchment (#EAE1C4) body background
> - White cards with green borders
> - Status pills in their respective colors

---

### SECTION 9 — FOOTER

**Position:** Bottom of page, full width, ~24mm from bottom
**Background:** rgba(0,0,0,0.25)
**Border-top:** 1px solid rgba(201,168,76,0.22)
**Padding:** 10px 20px
**Layout:** Two lines, centered

**Line 1 (primary info):**
- Inter 11px, weight 600, color #FFFFFF
- "Arrunabh Singh · Class XII B · Scholar No. 5411 · House Prithvi · DPS Indore"

**Line 2 (contact + links):**
- Inter 10px, weight 500, color rgba(255,255,255,0.55)
- "arrunabh.s@gmail.com  ·  vox-dpsi.vercel.app  ·  github.com/[repo]"
- URL "vox-dpsi.vercel.app" in gold #C9A84C (this is the 2nd permitted gold use)

**Request line (between two info lines, in a subtle pill):**
- Pill background: rgba(201,168,76,0.12), border: rgba(201,168,76,0.3), border-radius: 9999px
- Text: "Requesting 15 minutes of your time to demonstrate this live, sir."
- Inter 10px, italic, color rgba(255,255,255,0.7), padding 4px 12px

---

## GOLD ACCENT RULES — STRICT

Gold (#C9A84C / #C9920A) appears in EXACTLY these 3 places:
1. **"DPSI" in the logo wordmark** (always gold regardless of background)
2. **Stats bar numbers** (₹500, 3 weeks, 6 roles)
3. **Footer URL** (vox-dpsi.vercel.app)

Gold is used as subtle tints (rgba) for borders and backgrounds — these are NOT counted as "gold accent uses" since they're supporting decoration, not primary gold text/elements.

---

## VERTICAL SPACING PLAN (top to bottom on A4)

```
12mm    Top margin
18mm    Section 1: Header strip
10mm    Gap
20mm    Section 2: Hero (logo + tagline + divider)
8mm     Gap
36mm    Section 3: Two-column (problem + inspiration)
6mm     Gap
22mm    Section 4: Product description
6mm     Gap
28mm    Section 5: Role flow diagram
6mm     Gap
52mm    Section 6: Features grid (3×2)
5mm     Gap
18mm    Section 7: Stats bar
5mm     Gap
38mm    Section 8: Screenshots
6mm     Gap
24mm    Section 9: Footer
12mm    Bottom margin
──────
Total: ~298mm ≈ A4 (adjust section heights slightly if needed)
```

---

## DESIGN RULES & CONSTRAINTS

1. **DARK throughout** — the entire page uses the deep green gradient background. No parchment (#EAE1C4) on this page. That's the app background; the login screen's dark gradient is the reference for this PDF.

2. **No generic design** — every design choice must be traceable to the app. Green comes from #2D5C26. Gold comes from #C9A84C. Fonts are Inter + Outfit.

3. **No AI clip art or generic icons** — use only emoji or the actual VoxMark SVG. No random illustrations.

4. **No decorative lines under titles** — use background color variation and spacing to separate sections.

5. **Left-align body text** — center only the logo, tagline, divider, stats bar, and footer.

6. **Institutional voice** — this is a document to a school principal, not a startup pitch deck. The tone is formal, confident, and respectful. No exclamation marks outside feature names.

7. **Complaint number format** — always "VOX-001" (3 digit zero-padded), monospace font.

8. **Every section must feel like it belongs** — the header strip, flow diagram, feature cards, and stats bar should all look like they could be components exported from the actual app's component library.

---

## EXPORT INSTRUCTIONS

1. Export as **PDF** — A4, portrait, 300 DPI, CMYK-safe colors
2. Also export as **PNG** — 2480 × 3508 px (A4 at 300 DPI), RGB
3. Filename: `VoxDPSI_MeetingRequest_ArrunabhSingh.pdf`
4. Ensure all fonts are embedded in the PDF
5. No bleed or crop marks needed (this is for email attachment)

---

## REFERENCE FILES

The following source files from the Vox DPSI codebase are included in the zip attached to this prompt. Reference them for exact color values, component structure, and visual language:

```
design-reference.zip/
├── index.css              — all CSS variables, card styles, glassmorphism classes
├── constants.js           — all domain colors, status colors, role labels
├── tailwind.config.js     — extended color palette (navy, gold scales)
├── VoxLogo.jsx            — exact SVG path data for the shield logo
├── Navbar.jsx             — navbar implementation, gold border, green bg
├── Login.jsx              — login page: gradient bg, logo treatment, card style
├── ComplaintCard.jsx      — card layout, SLA badge, domain/status badge usage
├── StatusPill.jsx         — rounded pill implementation with border
├── DomainBadge.jsx        — domain badge with emoji + text
└── PrincipalDashboard.jsx — stats grid, tab nav, principal view layout
```

The screenshots in Section 8 of this document should match the live application aesthetic exactly — dark green navbar, parchment body, white cards with green-tinted borders, gold complaint numbers, colored domain and status pills.

---

## QUICK VISUAL SUMMARY

| Element | Value |
|---------|-------|
| Page bg | `linear-gradient(160deg, #1A2E16 → #2D5C26 → #1E3F18)` |
| Logo "VOX" | Outfit 800, white `#FFFFFF` |
| Logo "DPSI" | Outfit 800, gold `#C9920A` |
| Tagline | Inter 12px italic, `rgba(255,255,255,0.55)` |
| Section labels | Inter 9px bold uppercase, `rgba(201,168,76,0.7)` |
| Body text on dark | Inter 11–12px, `rgba(255,255,255,0.75)` |
| Stats numbers | Inter 28px black 900, gold `#C9A84C` |
| Primary button | bg `#2D5C26`, text `#C9A84C`, radius 10px |
| Card on dark | bg `rgba(255,255,255,0.06)`, border `rgba(255,255,255,0.10)`, radius 12–14px |
| Gold accent count | Maximum 3 (logo "DPSI", stats numbers, footer URL) |
| Fonts | Inter (body) + Outfit (logo only) — both Google Fonts |
| Domain: Academics | `#2563EB` on `#EFF6FF` |
| Domain: Safety | `#DC2626` on `#FEF2F2` |
| Status: Resolved | `#16A34A` on `#DCFCE7` |
| Status: In Progress | `#4F46E5` on `#EEF2FF` |
