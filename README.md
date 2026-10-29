# Bas 30 Din website

The website for the **Bas 30 Din** channel (bas30din.com) by Alok Mishra.
One skill at a time, learned in public. Each challenge is a course; each day is a lesson with a video, notes and files.

## Files

| File | What it is | Who edits it |
|---|---|---|
| `site-data.js` | **All content:** challenges, days, notes, files, links. | Edit this for new days. |
| `index.html` | Page skeleton: header, tabs, footer. | Rarely. |
| `styles.css` | All design: colors, fonts, layout. | Design changes only. |
| `app.js` | How the site works: tabs, course pages, lessons, Previous/Next. | Feature changes only. |
| `assets/` | Photos (`alok.png`, `pfp.jpg`) and video thumbnails (`assets/thumbs/`). | Add a thumbnail per new day. |
| `files/` | Small downloads (n8n workflows, PDFs). Under 25 MB each. Big files go on Google Drive. | Add files here. |

No build step, no framework. It is plain HTML, CSS and JavaScript. Open `index.html` in a browser to preview.

## Add a new day

1. Save the video thumbnail as `assets/thumbs/<VIDEO_ID>.jpg`.
2. In `site-data.js`, copy a `{ day: ... }` line inside that challenge's `days` and change it:
   - `video`: the code after `watch?v=` (or after `shorts/`), `short: true` for Shorts
   - `notes`: blank line = new paragraph, lines starting with `- ` = list
   - `files`: `[{ name: "n8n workflow", note: "Import into n8n", url: "files/day4.json" }]`
3. Upload. Done.

## Start a new challenge

Add a new object to `challenges` in `site-data.js` and set `current` to its `id` so it shows on the **Now** tab.
Status: `now`, `paused`, `done` or `soon`. Cover color: `coral`, `dark` or `sand`.

## Pages (hash routes)

`#now` current challenge · `#classroom` all challenges · `#c-<id>` one challenge · `#d-<id>-<day>` one lesson · `#files` · `#about`

## Brand rules

- Colors: coral `#FF6B57`, charcoal `#1E1E1E`, warm white ground `#F6F4F0`. Coral is the only accent.
- Fonts: Barlow Condensed (headings), Barlow (text).
- Light theme only. Real photos of Alok, never AI-generated faces. Real numbers only, never invented stats.
- English text everywhere. No em dashes in visible copy.

## Notes

- YouTube videos play inside the page only on bas30din.com. Elsewhere they open on YouTube.
- Hosting: any static host (Netlify, GitHub Pages, Cloudflare Pages).

## Subscriber updates (Brevo)

Signups use the public Brevo form in `site-data.js`, with email confirmation before joining the dedicated subscriber list. Netlify Forms is no longer used. Website updates are sent through Brevo's RSS Campaign integration, which checks `/rss.xml` daily and sends only when new entries appear.

Cloudflare's build command must be `node build-feed.cjs`. The script refreshes `rss.xml` from published lessons and files before every deployment. Give a new lesson today's `date`. Draft lessons/files should use `published: false`. For a file added later to an older lesson, give that file its own current `date` (YYYY-MM-DD). Uploading an unlisted folder alone does not email anyone. Existing lesson/file IDs stay stable, so small text corrections do not create duplicate entries. A replacement file at the same URL needs a new URL to count as a separate update.

Brevo's free plan has a total allowance of 300 email sends per day, including confirmation messages. Check the allowance as the subscriber list grows. Reply-to should use `alok@bas30din.com`, which remains in Zoho. No passwords or API keys are stored in this repository.
