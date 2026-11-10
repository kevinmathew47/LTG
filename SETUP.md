# Let's Talk GFC: going live

The site has three pages:

| Page | Who uses it | Link |
|---|---|---|
| `index.html` | **Public.** People register and get their QR pass. | `https://your-site/` |
| `gate-bayvwmtwla.html` | **Entry volunteers.** Scan passes, record arrival time, collect ₹100 from late arrivals. PIN required. | `https://your-site/gate-bayvwmtwla.html` |
| `crew-vmieok6wz8.html` | **Organisers.** Live list, stats, Excel export, dinner cut-off time. PIN required. | `https://your-site/crew-vmieok6wz8.html` |

The public page has no links to the scanner or the admin panel. Share those two links only with volunteers.

The data goes into a **Google Sheet** that you own, so you can also open it in Google Sheets at any time.

---

## Step 1: Create the Google Sheet and backend (about 10 minutes)

1. Go to <https://sheets.google.com> and create a blank sheet. Name it **Let's Talk GFC Registrations**.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the code that's there. Paste in everything from `apps-script/Code.gs`.
4. On line 10, change `const STAFF_PIN = 'CHANGE-ME';` to a secret PIN, for example `'4827'`. Volunteers type this PIN to unlock the scanner and admin panel.
5. Click **Save**. Choose `setup` in the function dropdown, then click **Run**. Google asks for permission: choose your account → **Advanced** → **Go to project** → **Allow**. A **Registrations** tab appears in your sheet.
6. Click **Deploy → New deployment**. Click the gear icon and pick **Web app**, then set:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

## Step 2: Connect the site

Open `site/config.js` and paste the URL:

```js
apiUrl: "https://script.google.com/macros/s/AKfy.../exec",
```

## Step 3: Put the site online (free)

The camera scanner only works on an `https://` address, so the site has to be hosted. The easiest option is **Netlify Drop**:

1. Go to <https://app.netlify.com/drop> and sign up for free.
2. Drag the whole **`site`** folder onto the page.
3. You get a link like `https://something.netlify.app`. In **Site settings → Change site name** you can rename it, for example `letstalkgfc.netlify.app`.

GitHub Pages or any other static host works too.

## Step 4: Test before Friday

1. Open the public link on your phone and register yourself.
2. Open `/gate-bayvwmtwla.html` on another phone, enter the PIN, tap **Start camera**, and scan your pass.
3. Open `/crew-vmieok6wz8.html` and check that you appear, then try **Export to Excel**.
4. Open the Google Sheet and check that your row is there.
5. In the admin panel, delete the test entries.

---

## How the dinner rule works

- The public page says **"Arrive by 5:45 PM — dinner is on us"**. You can change this in `config.js`.
- The scanner actually charges people who check in **after 5:45 PM**, which gives a 15-minute grace window. Change the cut-off time and fee in **Admin → Dinner rule**.
- The arrival time is the time of the scan, taken from the Google server in India time. The time on the volunteer's phone doesn't matter.
- If someone is late, the scanner shows **"Collect ₹100"** with **Paid · Cash** and **Paid · UPI** buttons.

## Dinner prepay by UPI (optional)

People who might arrive after 5:45 PM can prepay the ₹100 dinner by UPI from their pass. The money goes straight to your UPI ID: no payment company, no commission. **UPI can't confirm payments to a website by itself, so you check each one yourself.**

**Turn it on:**
1. Update the backend: open your Apps Script, replace the code with the new `apps-script/Code.gs` (keep your own `STAFF_PIN` on line 10), click **Save**, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The web app link stays the same. The sheet gets four new columns automatically: Dinner Prepay, UPI Ref (UTR), Prepay Claimed At, Prepay Checked At.
2. In `site/config.js`, put the UPI ID that should receive the money: `upi: { vpa: "yourname@okaxis", … }`. Push to GitHub; Vercel updates by itself.

**How it works:**
- After registering, the person sees **"Running late? Prepay dinner ₹100"** with **Pay with UPI app**, GPay / PhonePe / Paytm buttons and a QR code. The amount is locked to ₹100 and their pass code is in the payment note.
- After paying they type the **UPI transaction ID (UTR)** shown in their UPI app. Their pass then says **"Payment submitted · checking"**.
- In the admin panel, use the **Prepay to check** filter. Compare the UTR with your bank / UPI app, then tap **✓ Received** (or **✕ Reject**). Their pass then shows **Dinner prepaid ✓** (or asks them to retry).
- At the gate, someone you marked Received who arrives after 5:45 PM is let through as **Dinner prepaid**. If you haven't checked their UTR yet, the scanner shows it with **✓ Prepay received / ✕ Not received** buttons.
- The Excel export includes prepay status, UTR and times, plus totals on the Summary sheet.
- Leave `vpa` empty to hide the whole option.

## Donations page

`/donate.html` is linked from the nav bar ("♥ Donate"), the glass island menu, the phone ☰ menu and the footer. It uses the same UPI ID as the dinner prepay (`upi.vpa` in `site/config.js`) and stays as "Online donations open soon" until that's set.

- The donor picks ₹100 / ₹250 / ₹500 / ₹1000 or types an amount, adds their mobile number (and their name, optionally), then pays with **Pay with UPI app**, the GPay / PhonePe / Paytm buttons or the QR.
- They enter the **UPI transaction ID (UTR)**. The page shows **Verification pending** (spinning hourglass) and checks by itself every 15 seconds. They can close it and come back on the same phone.
- In the admin panel, the **Donations** section lists every donation with the full UTR. Check it in your bank / UPI app, then tap **✓ Verified** (or **✕ Reject**). The donor's page turns to **Payment successful** with a check mark and confetti, or to "We couldn't verify this payment".
- Donations are saved in a new **Donations** tab in your Google Sheet (created automatically after you update `Code.gs`) and exported as a **Donations** sheet in the Excel file.

**Practice mode:** add `?demo=1` to any page address (for example `/gate-bayvwmtwla.html?demo=1`) to try everything with fake data on that device only, with PIN `1234`. The live Google Sheet isn't touched. Handy for training volunteers.

## Good to know

- **Same number twice:** if someone registers again with the same mobile number, they get their existing pass back.
- **Lost pass:** people can tap "Already registered? Find my pass" on the public page. At the gate, volunteers can search by name or phone.
- **Walk-ins:** the scanner page has a "Register + check in" form for people who didn't register.
- **Handheld scanner:** a USB or Bluetooth QR scanner works in the code box on the scanner page. Just scan.
- **Demo mode:** while `apiUrl` is empty, the site runs in demo mode. Data stays in that one browser and the staff PIN is `1234`.
- **Changing Code.gs later:** after you edit it, go to **Deploy → Manage deployments → Edit → Version: New version → Deploy**. The URL stays the same.

## What's on the public page

- **Top bar:** spans the full width. When you scroll down it folds into a centred "LET'S TALK GFC" badge; tap it for the Register button.
- **Event details**, **registration** with a live pass preview, and a **Memory Match** game.
- **Entry pass:** a poster-style image with the person's name, pass code and QR code. They download it and show it at the entry.
- **Vibe (background music):** a slowed instrumental of "Coastline" plus soft waves and seagulls. It's **on by default**. Browsers don't allow sound until the visitor taps or clicks the page, so it starts on that first tap (or straight away where the browser allows it). The **🎧 Vibe on / Vibe off** button turns it off; that choice lasts for the visit.
  - Change the track or volume in `config.js` → `music: { file, volume }`.
  - "Coastline" belongs to Hollow Coves. Check you're allowed to use it on a public website, or swap in a royalty-free MP3.

## Go-live checklist

1. `apps-script/Code.gs`: `STAFF_PIN` changed, deployed as a web app (Anyone).
2. `site/config.js`: `apiUrl` set to the web app URL. The yellow "DEMO MODE" banner disappears once it's set.
3. Upload the whole `site` folder to Netlify (or any static host). The `_headers` file sets caching and allows the camera for the scanner page.
4. After you have the final address, edit `site/index.html` and change `og:image` to the full URL, for example `https://letstalkgfc.netlify.app/assets/og.jpg`, so WhatsApp and Instagram show the poster when the link is shared.
5. Test on two phones: register → download pass → scan it with `/gate-bayvwmtwla.html` → check `/crew-vmieok6wz8.html` and the Google Sheet.
6. Delete the test entries from the admin panel.
