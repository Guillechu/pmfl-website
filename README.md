# PMFL — Panama Major Football League

A modern, responsive front-end for the Panama Major Football League (PMFL),
sanctioned by the American Football Federation of Panama (AFFP).

Built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS** —
component-based, dark-mode first, mobile-friendly.

---

## Quick start

```bash
# 1. install
npm install

# 2. run the dev server
npm run dev

# 3. open the site
# http://localhost:3000
```

Build for production:

```bash
npm run build
npm run start
```

> Requires Node 18.17+ (Node 20+ recommended).

---

## Project structure

```
pmfl-website/
├─ app/                     # Next.js App Router routes
│  ├─ layout.tsx            # Global layout (Navbar + Footer)
│  ├─ globals.css           # Tailwind + theme tokens
│  ├─ page.tsx              # Home
│  ├─ teams/
│  │  ├─ page.tsx           # Teams grid
│  │  └─ [slug]/page.tsx    # Single team detail (roster, schedule, stats)
│  ├─ stats/page.tsx        # Team & player rankings (sortable + filters)
│  ├─ schedule/page.tsx     # Full season schedule (filter by week / team)
│  ├─ media/page.tsx        # Play of the Week + highlights grid
│  ├─ gallery/page.tsx      # Lightbox image gallery
│  ├─ sponsors/page.tsx     # Tiered sponsors + carousel
│  ├─ contact/page.tsx      # Contact form (POSTs to /api/contact)
│  ├─ api/contact/route.ts  # Mock API handler
│  ├─ not-found.tsx         # 404
│  ├─ error.tsx             # Error boundary
│  └─ loading.tsx           # Suspense fallback
│
├─ components/              # Reusable React components
│  ├─ Navbar.tsx            # Sticky responsive nav with search
│  ├─ Footer.tsx
│  ├─ Hero.tsx
│  ├─ LeagueMark.tsx        # PMFL inline SVG logo
│  ├─ TeamMark.tsx          # Generated team badge from team colors
│  ├─ TeamCard.tsx
│  ├─ PlayerCard.tsx
│  ├─ GameCard.tsx
│  ├─ StatsTable.tsx        # Generic sortable table
│  ├─ SearchBar.tsx         # Teams + players combo search
│  ├─ Lightbox.tsx          # Gallery lightbox (keyboard nav)
│  ├─ VideoEmbed.tsx        # 16:9 YouTube embed
│  ├─ SponsorCarousel.tsx   # Marquee sponsor logos
│  └─ ui/                   # Primitives: Card, Badge, EmptyState, Skeleton
│
├─ data/                    # Mock JSON content — edit these freely
│  ├─ teams.json
│  ├─ players.json
│  ├─ schedule.json
│  ├─ stats.json
│  ├─ media.json
│  ├─ gallery.json
│  └─ sponsors.json
│
├─ lib/
│  ├─ types.ts              # Shared domain types
│  ├─ data.ts               # Data accessors / helpers (standings, leaders…)
│  └─ utils.ts              # cn(), formatGameDate(), slugify()
│
├─ public/                  # Static assets (favicon, images go here)
├─ tailwind.config.ts       # Brand palette + animations
├─ next.config.js
└─ package.json
```

---

## Where to edit content

All visible content is driven by JSON in `/data` — no DB required.

| File | What it controls |
|---|---|
| `data/teams.json` | Team roster, conference, colors, record, descriptions |
| `data/players.json` | Player roster + per-player stats (linked to a team via `teamId`) |
| `data/schedule.json` | Every game, by week, with optional scores when finished |
| `data/stats.json` | Featured stat-leader IDs (references players) |
| `data/media.json` | Play of the Week + highlight reels (YouTube IDs) |
| `data/gallery.json` | Image URLs + categories for the gallery |
| `data/sponsors.json` | Sponsor names + tier (Platinum/Gold/Silver/Bronze) |

To **add a team**, add a new object to `data/teams.json` with a unique `id`
(this `id` becomes the team URL: `/teams/<id>`). The team page is generated
statically via `generateStaticParams` in `app/teams/[slug]/page.tsx`.

To **add a game**, add to `data/schedule.json`. If `homeScore`/`awayScore`
are `null` and `status` is `"scheduled"`, the game is treated as upcoming.

To **brand the site differently**, edit the palette in `tailwind.config.ts`
under `theme.extend.colors.brand`.

---

## Tech notes

- **Framework**: Next.js 14 with the App Router
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS, dark mode forced via `<html className="dark">`
- **Fonts**: Oswald (display) + Inter (body), loaded via Google Fonts in `globals.css`
- **State**: All page state is local (`useState`) — no global store needed
- **Server**: Pages are static; the contact form posts to a tiny mock route handler

### Replacing the mock API later

`app/api/contact/route.ts` currently logs the message to the console. To
hook up real email, swap that handler for a call to your provider
(e.g. Resend, SendGrid, AWS SES) and keep the same request shape.

### Replacing JSON with a real backend

`lib/data.ts` is the single import surface for data — pages don't import
from `data/*.json` directly. To swap in an API:

1. Replace the `import` statements in `lib/data.ts` with `await fetch(...)`
   calls (and convert the helpers to async).
2. Pages already use these accessors, so the change ripples through cleanly.

---

## Accessibility & responsiveness

- Mobile-first layout, breakpoint-aware grids
- Sticky navbar collapses to a hamburger menu on `<lg`
- Lightbox supports `Esc`, `←`, `→` keys
- Sortable tables expose sort direction visually
- Color contrast meets WCAG AA on the dark theme

---

## Roadmap ideas

- [ ] Player detail pages (`/players/[id]`)
- [ ] Live scores via websocket
- [ ] CMS integration (Sanity, Contentful) replacing JSON
- [ ] Spanish localization
- [ ] Real authentication for admin updates

---

## License

© Panama Major Football League. All rights reserved.
Sanctioned by the American Football Federation of Panama (AFFP).
