# GSB Atlas

A liquid glass research directory of Stanford Graduate School of Business MBA alumni at major US middle-market and upper-middle-market private equity firms.

**Website:** https://dev1niscool.github.io/GSB_Atlas/

Current edition: **28 firms, 80 verified Stanford GSB MBA profiles, 80 attributed portraits, and 51 sourced professional emails.** The expanded email research added 29 addresses to the original 22.

## Use locally

This is a dependency-free static site. Serve the repository root, for example:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`. There is no build step, server account, analytics, or API key.

## Research

Research is a public-source snapshot reviewed October 7, 2026. The directory focuses on Stanford GSB MBA graduates; Stanford undergraduate education alone does not qualify. Current public firm rosters and individual biographies support affiliation and education. Professional emails are included only when explicitly published in a cited company publication, public filing, or publicly accessible third-party directory listing. Every address includes a source classification, review date, evidence excerpt, and source context. Historical filings and third-party listings are labeled; no address has been tested for deliverability. No email patterns are inferred, and masked, personal, and former-employer addresses are excluded. Unpublished interests, graduation years, and photos remain unavailable.

The firm universe is an editorial selection of major US-based middle-market and UMM-active buyout platforms, not a certified or exhaustive national top-25 league table. Some platforms also invest at large-cap scale. Rankings use the latest accessible disclosed AUM. AUM dates, firmwide/adviser entity scope, regulatory definitions, and inclusion of credit or other strategies vary. Cumulative capital raised/invested is not substituted for AUM. See each firm's source notes.

The public web cannot establish a complete list of every graduate. Zero identified alumni means none verified in this research pass. Current public biographies can lag role changes.

Source research is in `research/group-*.json`; the application reads `data/atlas.json`. Run `python3 scripts/build_data.py` after updating source research, then `python3 scripts/validate_data.py`. The application normalizes sector tags for filtering while retaining the original sector descriptions in profiles.

## Features

- Search by person, firm, role, sector, or background
- AUM rankings with source dates and metric definitions
- Firm, sector, and publicly listed email filters with a live email coverage count
- Detailed biographies, education, interests, professional contact sources, and attributed portraits
- Browser-local saved profiles
- Source-inclusive CSV export of the current filtered results, including email evidence type and research notes
- Keyboard-accessible dialogs, mobile layouts, and reduced-motion support

## Deployment

GitHub Pages serves `main` from the repository root; `.nojekyll` disables Jekyll processing. All application URLs are relative so the site works under `/GSB_Atlas/`. A validation workflow checks the dataset and JavaScript when changes are pushed.

## Attribution

Independent research, not affiliated with Stanford University or any firm listed. Portraits and source materials remain the property of their respective owners. Images are linked from public professional sources; two Clearlake portraits are extracted from the firm’s publicly hosted December 2023 SERS presentation (page 13); missing or failed portraits display a labeled initials fallback. Third-party fonts load from Google Fonts. Bookmarks stay in the visitor's browser.
