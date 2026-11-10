# Let's Talk GFC

Registration website for **Let's Talk GFC — God, Faith & Conversations**
Friday 13 November 2026 · 6 PM · Christos Mar Thoma Church, Kakkanad
Christos Mar Thoma Church Yuvajana Sakhyam

## What's here

| Folder | What it is |
|---|---|
| `site/` | The website (static HTML/CSS/JS). This is the folder that gets deployed. |
| `apps-script/Code.gs` | Google Apps Script backend that stores registrations in a Google Sheet. |
| `SETUP.md` | Step-by-step setup and go-live guide. |

## Deploying on Vercel

Import this repository in Vercel and set **Root Directory** to `site`.
No build step: Framework Preset **Other**, build command empty, output directory empty.

`site/vercel.json` sets the security, caching and no-index headers.

## Settings

Edit `site/config.js`: backend URL, arrival time, late fee and background music.
The staff PIN is set only inside the deployed Apps Script, never in this repository.
