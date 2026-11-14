/* ==========================================================================
   BAS 30 DIN · THE ONLY FILE TO EDIT
   --------------------------------------------------------------------------
   current     = the id of the challenge shown on the Now tab.
   New day?    Copy one { day: ... } line inside "days" and change it.
               video = the code after "watch?v=" (or after "shorts/").
               short: true for YouTube Shorts.
               thumb = image file in assets/thumbs/ ("" = no picture).
   Notes?      Write them in notes. A blank line starts a new paragraph.
               Lines starting with "- " become a list.
   Files?      files: [ { name: "n8n workflow", note: "Import into n8n", url: "https://..." } ]
               A Google Drive link works best.
   Status      now | archive | done | soon   (archive = earlier challenge, shown with no status label)
   Cover       coral | dark | sand | wash   (photo: true puts Alok's photo on it)
   Dates are "YYYY-MM-DD".
   ========================================================================== */
window.SITE = {
  name: "Bas 30 Din",
  domain: "bas30din.com",
  youtube: "https://www.youtube.com/@bas30din",
  instagram: "https://www.instagram.com/bas30din/",
  email: "collab@bas30din.com",   // shown on About + footer as "Collabs"
  current: "ai-lakhs",
  // Email list box ("Get it in your inbox"). Since 4 Nov 2026 signups go to the Google Sheet
  // "Bas 30 Din — Subscribers" (Apps Script web app); Alok's n8n sends the welcome email.
  inbox: {
    on: true,
    sheetUrl: "https://script.google.com/macros/s/AKfycbw77dxWW3PrruoQHzEjXHkOLygZrZkIN-Z2kV_mNTJoeGyquqtDL2L3xapf3cxHuGUIcA/exec",
    brevoUrl: "https://66da3047.sibforms.com/serve/MUIFAAQ7owXXWGUKUMojvD2015EnyAiYMA1buivm5iEVXyFDbUbNXaTND1vAfVFfiMiJ0c8xYemcJy3icaLhV2SYxB49h7HKGd9fZwUKXg-AE5AkK4q-Ot0TlgcswM5P7Dwg-_efXqXpAg_1uq-RZluEehbmjs_fl8Z3AGIzyi6mj_ils676NQ6bRt_97ZnyDyGefe0no0GmAQ8v0Q==",   // old Brevo form, kept as backup (not shown)
    title: "Get it in your inbox",
    text: "New lessons, notes and files when I publish them. Free.",
    button: "Send it to me",
    done: "You're in. Check your inbox in a few minutes (and Promotions, just in case).",
    small: "No spam. Reply \"stop\" any time and I take you off. I never share your email."
  },
  // Now tab: a short note in Alok's own words (edit freely). A blank string hides it.
  nowNote: [
    "Hi, I'm Alok. Here's what I'm doing next.",
    "Everywhere on Instagram, people say you can learn AI automation without coding and earn lakhs a month. Maybe it's true. Maybe it's mostly people selling courses. I want to know for real, so I'm testing it myself.",
    "First I'm learning it properly, at my own pace, without a fixed syllabus. Then 30 days of actually trying: building real things, talking to real businesses, trying to get paid.",
    "Every hour and every rupee goes on screen. Friends and family don't count. And there's no course at the end. Just the truth, plus my notes and files so you can do it faster than I did.",
    "Day 0 is coming soon."
  ],
  // Small line above every challenge title (approved brand line).
  kicker: "The internet says a lot. I test it myself.",
  // About > My story. His own words (8 Nov 2026). Only voice-typing slips fixed. Edit freely.
  story: [
    "I have been thinking about this thing for a long time.",
    "The internet says you can make lakhs of money using editing. You can make lots of money using AI. Take this free course and you will never need another course.",
    "I always wondered whether this works or not. Because most of the time, people are selling courses and making money from there. Not from the actual work.",
    "So I wanted to test it myself, and show other people how it worked for me, or not.",
    "So now I pick one skill, give it 30 days, do everything that is needed, and check the claim, whether it was right or not."
  ],

  challenges: [
    {
      id: "ai-lakhs",
      title: "Instagram Says AI Automation Pays Lakhs. I'm Testing It.",
      coverTitle: "AI automation: ₹ lakhs?",
      oneLine: "Can you really earn lakhs with AI automation? 30 days, every rupee shown.",
      status: "now",
      cover: "coral", photo: true,
      totalDays: 30,
      started: "2026-11-11",   // Day 1 (Day 0 was 10 Nov). The live day moves on by itself every day from this date; past days unlock by themselves.
      // The claim being tested: shown as "claim VS me" on the home page and every day page.
      // img = a REAL post (no faces). url = where it came from (kept for our records; the picture is not a link).
      claim: { img: "assets/claim-1lakh.jpg", url: "https://www.youtube.com/watch?v=RVaEJQaBNq4", by: "Vedantu Upskill Academy on YouTube", says: "Earn ₹1 lakh / monthly" },
      // The Day 0 trailer for the big play tile on the home page. video = YouTube code. thumb = file in assets/thumbs/.
      trailer: { video: "", short: true, thumb: "", length: "" },
      // The receipt: REAL numbers only. null = not started yet (shows "—").
      // Update these as the challenge runs, e.g. hours: 12, spent: 499, earned: 0
      ledger: { hours: null, spent: null, earned: 0 },
      about: "", learn: ["What the 'lakhs' claim really promises", "What it takes to get a first paying client", "What real earners do differently"], tools: [],
      // A day with video: "" shows "goes up today" until the link is added. published: false keeps it out of the email feed.
      // pictures (optional) = "Today in 3 pictures": [{ img: "assets/days/d1-1.jpg", text: "What I tried" }, ...]
      days: [
        { day: 0, date: "2026-11-10", title: "I tried the ₹1 lakh/month AI automation side hustle from ₹0", video: "Uk9jR-sHN1g", short: false, length: "7 min", thumb: "Uk9jR-sHN1g.jpg", notes: "", files: [], pictures: [], published: false },
        { day: 1, date: "2026-11-11", title: "AI automation se ₹0 kyun?", video: "FEhyYIcny8g", short: true, length: "1 min", thumb: "FEhyYIcny8g.jpg", notes: "", files: [], pictures: [], published: false },
        { day: 2, date: "2026-11-12", title: "4 cold calls, ₹0 so far", video: "Dt04NZnXxZU", short: true, length: "2 min", thumb: "Dt04NZnXxZU.jpg", notes: "", files: [], pictures: [], published: false },
        { day: 3, date: "2026-11-13", title: "7 cold calls, ₹0 so far", video: "5777tYUiKJI", short: true, length: "3 min", thumb: "5777tYUiKJI.jpg", notes: "", files: [], pictures: [], published: false }
      ]
    },
    {
      id: "ai-automation",
      title: "14 Days of AI Automation",
      coverTitle: "AI Automation from zero",
      oneLine: "Make your computer do boring work for you. No coding.",
      status: "archive",
      cover: "wash", photo: true,
      totalDays: 14,
      started: "2026-10-14",
      about: "",
      learn: ["What automation is, in simple words", "Make a reel post itself on Instagram", "Build your first AI agent"],
      tools: ["n8n (free)", "Google Drive"],
      days: [
        { day: 1, date: "2026-10-14", title: "Learning AI automation in 14 days, zero coding", video: "heEGRYpJiGw", length: "11 min", thumb: "heEGRYpJiGw.jpg", notes: "", files: [] },
        { day: 2, date: "2026-10-16", title: "My first n8n auto-posting workflow", video: "wTkddhJGJWg", length: "31 min", thumb: "wTkddhJGJWg.jpg", notes: "", files: [] },
        { day: 3, date: "2026-10-20", title: "Build your first AI agent in under 15 minutes", video: "ggrnz_vEWjA", length: "14 min", thumb: "ggrnz_vEWjA.jpg", notes: "", files: [] }
      ]
    },
    {
      id: "work-tools",
      title: "3 Tools Companies Pay For",
      coverTitle: "3 tools in 30 days",
      oneLine: "Google Forms, Sheets and Looker Studio, free versions only.",
      status: "archive",
      cover: "dark", photo: false,
      totalDays: 30,
      started: "2026-10-03",
      about: "Three tools companies actually pay people to know. I'm learning them using only the free versions.",
      learn: ["Collect answers with Google Forms", "Turn answers into a live dashboard", "Use Google Sheets for real work"],
      tools: ["Google Forms", "Google Sheets", "Looker Studio"],
      days: [
        { day: 0, date: "2026-10-03", title: "The plan: 3 tools in 30 days, free only", video: "iswjaSKfh9Y", short: true, length: "1 min", thumb: "iswjaSKfh9Y.jpg", notes: "", files: [] },
        { day: 1, date: "2026-10-05", title: "I built my first dashboard", video: "qBuYAa_Kj84", short: true, length: "1 min", thumb: "qBuYAa_Kj84.jpg", notes: "", files: [] },
        { day: 2, date: "2026-10-05", title: "Google Sheets basics", video: "TG4gifPjsf8", short: true, length: "1 min", thumb: "TG4gifPjsf8.jpg", notes: "", files: [] },
        { day: 4, date: "2026-10-07", title: "A dashboard in Google Sheets, free", video: "dIH8T7GqgqY", short: true, length: "1 min", thumb: "dIH8T7GqgqY.jpg", notes: "", files: [] },
        { day: 5, date: "2026-10-08", title: "Day 5 progress", video: "3wZ_VZxyHpQ", short: true, length: "1 min", thumb: "3wZ_VZxyHpQ.jpg", notes: "", files: [] },
        { day: 7, date: "2026-10-10", title: "Week 1: a full dashboard for ₹0", video: "M9mhVILz3iU", short: true, length: "1 min", thumb: "M9mhVILz3iU.jpg", notes: "", files: [] }
      ]
    },
    {
      id: "english-speaking",
      title: "30 Days of English Speaking",
      coverTitle: "English Speaking",
      oneLine: "From freezing to speaking. Season 1 starts soon.",
      status: "soon",
      cover: "sand", photo: false,
      totalDays: 30,
      started: null,
      about: "", learn: [], tools: [], days: []
    }
  ]
};
