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
   Status      now | paused | done | soon
   Cover       coral | dark | sand   (photo: true puts Alok's photo on it)
   Dates are "YYYY-MM-DD".
   ========================================================================== */
window.SITE = {
  name: "Bas 30 Din",
  domain: "bas30din.com",
  youtube: "https://www.youtube.com/@bas30din",
  instagram: "https://www.instagram.com/bas30din/",
  email: "collab@bas30din.com",   // shown on About + footer as "Collabs"
  current: "ai-lakhs",
  // Email list box ("Get it in your inbox"). Emails are collected by Netlify Forms (form name: "inbox").
  inbox: {
    on: true,
    title: "Get it in your inbox",
    text: "Every week: what I tested, what actually worked, and the files. Free.",
    button: "Send it to me",
    done: "You're in. Watch your inbox.",
    small: "No spam. Unsubscribe any time. I never share your email."
  },
  // Now tab: a short note in Alok's own words (edit freely). A blank string hides it.
  nowNote: [
    "Hi, I'm Alok. Here's what I'm doing next.",
    "Everywhere on Instagram, people say you can learn AI automation without coding and earn lakhs a month. Maybe it's true. Maybe it's mostly people selling courses. I want to know for real, so I'm testing it myself.",
    "First I'm learning it properly, at my own pace, without a fixed syllabus. Then 30 days of actually trying: building real things, talking to real businesses, trying to get paid.",
    "Every hour and every rupee goes on screen. Friends and family don't count. And there's no course at the end. Just the truth, plus my notes and files so you can do it faster than I did.",
    "Day 0 is coming soon."
  ],
  why: "I used to start everything and finish nothing. So now I pick one skill, give it a fixed number of days, and do it in public, so I can't quit quietly.",

  challenges: [
    {
      id: "ai-lakhs",
      title: "Instagram Says AI Automation Pays Lakhs. I'm Testing It.",
      coverTitle: "AI automation: ₹ lakhs?",
      oneLine: "Can you really earn lakhs with AI automation? 30 days, every rupee shown.",
      status: "soon",
      cover: "coral", photo: true,
      totalDays: 30,
      started: null,
      about: "", learn: ["What the 'lakhs' claim really promises", "What it takes to get a first paying client", "What real earners do differently"], tools: [], days: []
    },
    {
      id: "ai-automation",
      title: "14 Days of AI Automation",
      coverTitle: "AI Automation from zero",
      oneLine: "Make your computer do boring work for you. No coding.",
      status: "paused",
      cover: "coral", photo: true,
      totalDays: 14,
      started: "2026-10-14",
      about: "Paused after Day 3, on purpose. I'm learning the fundamentals of automation properly first. Then I test the biggest claim on Instagram: that AI automation earns people lakhs a month. Every rupee shown. The notes and files for every day land here, so you can do it in 10 minutes instead of a whole day.",
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
      status: "paused",
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
