---
name: NEXO Mobility Design System
colors:
  surface: '#15121d'
  surface-dim: '#15121d'
  surface-bright: '#3b3744'
  surface-container-lowest: '#100c18'
  surface-container-low: '#1d1a26'
  surface-container: '#211e2a'
  surface-container-high: '#2c2834'
  surface-container-highest: '#373340'
  on-surface: '#e7dff0'
  on-surface-variant: '#cdc2d8'
  inverse-surface: '#e7dff0'
  inverse-on-surface: '#322e3b'
  outline: '#968da1'
  outline-variant: '#4b4455'
  surface-tint: '#d4bbff'
  primary: '#d4bbff'
  on-primary: '#41008b'
  primary-container: '#8a3ffc'
  on-primary-container: '#faf1ff'
  inverse-primary: '#7825ea'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#27e0aa'
  on-tertiary: '#003828'
  tertiary-container: '#007f5e'
  on-tertiary-container: '#ceffe7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ebdcff'
  primary-fixed-dim: '#d4bbff'
  on-primary-fixed: '#270058'
  on-primary-fixed-variant: '#5d00c2'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#54fdc5'
  tertiary-fixed-dim: '#27e0aa'
  on-tertiary-fixed: '#002116'
  on-tertiary-fixed-variant: '#00513b'
  background: '#15121d'
  on-background: '#e7dff0'
  surface-variant: '#373340'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.015em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

### Brand Personality & Aesthetic Direction
This design system establishes an atmospheric, high-end mobility experience centered on neon-infused dark elegance. It marries technical precision with a nocturnal luxury tone, creating a frictionless, calming, yet electrifying environment tailored for urban transit, premium ride-hailing, and swift micro-transactions.

### Style Archetype: Cyber-Chic Glassmorphism & Nocturnal Depth
- **Atmosphere:** Deep cosmic night layered with electric violet luminaries and bioluminescent accents.
- **Surface Quality:** Translucent obsidian glass layered over deep violet-black canvases, using precise gradient borders (specular strokes) and subdued outer glows to indicate interaction states and vehicle tracking.
- **Target Audience:** Modern urbanites, commuters, and executives demanding speed, clarity, safety, and an unmistakable sense of premium hospitality.
- **Flutter Framework Translation:** Optimized for hardware-accelerated rendering through `BackdropFilter` (Gaussian blur 16–24px), layered `BoxDecoration` gradients, and lightweight `CustomPainter` vector elements.

## Colors

### Canvas & Backgrounds
- **Canvas Base (`bg-root`):** `#0B0813` (Dominant app floor, OLED energy-saver)
- **Canvas Surface Layer 1 (`bg-surface-subtle`):** `#120D24`
- **Canvas Surface Layer 2 (`bg-surface-elevated`):** `#191230`

### Glass Surfaces & Overlays
- **Card Base Fill:** `rgba(31, 22, 56, 0.72)` (`#1F1638` with 72% opacity)
- **Elevated Sheet / Modal:** `rgba(40, 29, 74, 0.88)` (`#281D4A` with 88% opacity)
- **Glass Specular Stroke (Borders):** Linear gradient from `rgba(138, 63, 252, 0.45)` to `rgba(93, 62, 172, 0.15)`

### Accents & Gradients
- **Primary Electric Violet:** `#8A3FFC`
- **Secondary Neon Purple:** `#A855F7`
- **Luminous Lilac (High-Contrast Text/Accents):** `#E9D5FF`
- **Active Gradient (`gradient-primary`):** Linear `from: #7C3AED` to `to: #A855F7` (Angle: 135deg)
- **Primary Glow Tint:** `rgba(168, 85, 247, 0.35)` with 20px blur radius

### Functional & Transactional Semantics
- **PIX & Instant Success:** `#00D5A0` / `#10B981` (Accessible against dark violet)
- **Transit Info & Card Processing:** `#3B82F6` (Electric Blue)
- **Urgent / Cancellation / Danger:** `#EF4444` (Vivid Crimson)
- **Warning / Surge Pricing:** `#F59E0B` (Vibrant Amber)

### Typography & Contrast Rules
- **Text High-Emphasis:** `#FFFFFF` (100% opacity, 16.5:1 contrast against `#0B0813`)
- **Text Medium-Emphasis:** `#D1C7E8` (Lilac-gray, 80% opacity)
- **Text Low-Emphasis / Placeholders:** `#8B7EA8` (55% opacity)

## Typography

### Character & Legibility Strategy
The typographical identity is structured entirely around **Plus Jakarta Sans**, offering geometric, highly balanced curves that feel simultaneously approachable and aerodynamically modern.

### Numerical Legibility in Mobility
All fare indications, arrival ETAs, vehicle license plates, and coupon discount percentages utilize `FontFeature.tabularFigures()` within Flutter `TextStyle` to ensure zero horizontal jitter during live GPS countdown updates.

### Scale Application
- **Display & Headline Roles:** Reserved for ride completion banners, greeting headlines ("Olá, Lucas!"), and hero promo claims.
- **Body Roles:** Structured for street addresses, driver profiles, vehicle models, and legal ride disclaimers.
- **Label Roles:** Optimized for micro-chips, ride category badges (`Nexo Conforto`, `Nexo Black`), tab-bars, and CTA buttons.

## Layout & Spacing

### Layout Philosophy
Mobile-first architecture engineered around single-handed Android interaction paradigms. The UI prioritizes thumb-accessible bottom sheets (`DraggableScrollableSheet` in Flutter) while keeping map telemetry uncluttered in the upper viewport.

### Grid & Metrics
- **Canvas Base Padding:** `margin` = `20px` (`1.25rem`) standard across mobile edges.
- **Vertical Rhythm:** 8pt modular grid (`space-xs: 4px`, `space-sm: 8px`, `space-md: 16px`, `space-lg: 24px`, `space-xl: 32px`).
- **Gutter Distance:** `16px` (`1rem`) between card items within horizontal carousels (e.g., vehicle tiers: Nexo Popular, Nexo Conforto, Nexo Black).

### Safe Areas & Touch Target Boundaries
- Minimum touch target dimension: `48x48dp` for all floating action buttons, map pins, and header navigation elements.
- Bottom sheet content adheres to a bottom padding equivalent to `MediaQuery.of(context).padding.bottom + 16px`.

## Elevation & Depth

Visual hierarchy does not rely on standard drop shadows, but instead uses light emission, surface opacity shifts, and tinted ambient halos:

### 1. The Map Level (Depth 0)
- Deep navy, desaturated vector map styling with high-contrast glowing route lines (`#A855F7` core with a 6px neon blur halo).

### 2. Base Surface / Panels (Depth 1)
- **Fill:** `#1F1638` at 75% opacity with an underlying `ImageFilter.blur(sigmaX: 18, sigmaY: 18)`.
- **Border:** 1px stroke using `#432C7A` (50% alpha).
- **Shadow:** Tinted ambient shadow `BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 4))`.

### 3. Interactive Floating Cards & Modals (Depth 2)
- **Fill:** `#281D4A` at 90% opacity.
- **Border:** Specular gradient highlight `LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0x708A3FFC), Color(0x205D3EAC)])`.
- **Shadow:** `BoxShadow(color: Color(0x550B0813), blurRadius: 24, offset: Offset(0, 8))`.

### 4. Focused Actions & Highlights (Depth 3 - Neon Glow)
- Primary CTA buttons and key badges feature an electric under-glow:
  - `BoxShadow(color: Color(0x668A3FFC), blurRadius: 20, spreadRadius: -2, offset: Offset(0, 4))`

## Shapes

### Shape Language & Geometry
The system uses expansive, continuous curvature to convey fluidity and speed. Interfaces feel organic and friendly, avoiding harsh mechanical corners.

### Radius Assignments
- **Primary Buttons & Floating Search Bars:** Full Pill (`BorderRadius.circular(999)`).
- **Vehicle Selection & Trip Info Cards:** `rounded-2xl` (`16px` to `20px` radius).
- **Persistent Bottom Sheets & Modal Drawers:** `rounded-3xl` (`28px` to `32px` on top-left and top-right corners).
- **Badges, Avatar Rings & Small Status Tags:** Pill (`999px`) or `rounded-md` (`8px`).
- **Input Fields:** `rounded-xl` (`14px` to `16px`).

## Components

### 1. Buttons
- **Primary CTA (`Gradient Button`):**
  - **Height:** `54dp` on mobile.
  - **Background:** `LinearGradient(colors: [#7C3AED, #A855F7])`.
  - **Border Radius:** Fully rounded pill (`999dp`).
  - **Typography:** `label-lg`, `#FFFFFF`, font-weight `700`.
  - **Glow:** Violet outer diffuse glow (`#8A3FFC` at 35% opacity, blur `16dp`).
- **Secondary / Ghost Button:**
  - **Background:** `rgba(31, 22, 56, 0.6)`.
  - **Border:** `1dp` solid `#432C7A`.
  - **Typography:** `label-lg`, `#E9D5FF`.

### 2. Vehicle Selection Cards
- **Dormant State:**
  - Background `#1F1638` at 60% opacity.
  - 1px border `#31215C`.
  - Scaled car thumbnail centered, ride title in `label-md`, price in `body-lg` bold.
- **Selected State:**
  - Background `#281D4A` with 95% opacity.
  - 1.5px border `#A855F7`.
  - Ambient glow halo around the card container.
  - ETA tag highlighted in luminous lilac (`#E9D5FF`).

### 3. Input Fields & Search Bars
- **Address Search Bar:**
  - Pill-shaped (`999dp`), height `52dp`.
  - Fill: `rgba(25, 18, 48, 0.85)` with blur filter.
  - Leading search glyph in `#A855F7`.
  - Trailing action button (circular gradient arrow icon).
  - Placeholder text in `#8B7EA8`.

### 4. Bottom Navigation Bar
- **Form Factor:** Floating dock or anchored bar with translucent dark violet background (`rgba(11, 8, 19, 0.92)`).
- **Top Border:** 1px stroke `#281D4A`.
- **Selected Tab:** Icon tinted `#A855F7` with a subtle bottom glowing indicator dot.
- **Unselected Tab:** Icon and label in `#8B7EA8`.

### 5. Chips, Badges & Payment Toggles
- **Payment Method Item:**
  - Rounded-xl (`14dp`), horizontal layout with asset icon (e.g., PIX green glyph, Mastercard badge), title, and radio selector.
  - Verified/Active indicators use `#00D5A0` checkmarks with subtle glow.
- **Discount & Status Badges:**
  - Pill-shaped, background `rgba(138, 63, 252, 0.18)`, border `1dp` `#8A3FFC`, text `#E9D5FF` in `label-sm`.

### 6. Iconography
- Clean 1.5–2dp stroke weight, rounded cap and join.
- Pure white `#FFFFFF` for primary actions, `#A855F7` for focal contextual icons, and `#00D5A0` for instant financial transactions.