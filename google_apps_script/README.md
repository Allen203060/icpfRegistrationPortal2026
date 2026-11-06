# 📝 Google Forms & Google Sheets Integration Guide

This guide walks you through setting up real-time automatic attendee registration from your **Google Form** to the **ICPF Camp Registration Backend**.

Whenever a camper submits your Google Form:
1. Google Apps Script intercepts the submission.
2. Sends the attendee's details via HTTP POST to `/api/participants/register`.
3. The backend runs the 4-tier diversity heuristic allocator in real time.
4. The assigned **Group Name (Group A–J)**, **Dorm Room**, and **Badge #** are automatically written back into the Google Sheet!

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Link your Google Form to a Google Sheet
1. Open your Google Form.
2. Go to the **Responses** tab.
3. Click **Link to Sheets** (or the green Sheets icon) to create a linked spreadsheet.

---

### Step 2: Open the Apps Script Editor
1. In the linked Google Sheet, click **Extensions** in the top navigation bar.
2. Select **Apps Script**.
3. A code editor will open in a new tab.

---

### Step 3: Paste the Script Code
1. Erase any default code in the editor.
2. Copy the full contents of [`google_apps_script/Code.gs`](./Code.gs) and paste it into the editor.
3. Replace the `BACKEND_URL` on line 21:
   ```javascript
   const BACKEND_URL = "https://your-public-backend-url.com";
   ```
   > [!TIP]
   > **For Local Development / Testing:**
   > Google Apps Script runs in Google's cloud and cannot directly reach `http://localhost:5000`. Use a quick tunnel to expose your local backend:
   > ```bash
   > npx localtunnel --port 5000
   > # or with Cloudflare:
   > npx cloudflared tunnel --url http://localhost:5000
   > ```
   > Copy the generated public URL (e.g. `https://sharp-foxes-sing.loca.lt`) and set it as `BACKEND_URL`.

4. Click the **Save** icon (Floppy disk / `Ctrl+S`).

---

### Step 4: Create the "On Form Submit" Trigger
1. In the Apps Script sidebar on the left, click **Triggers** (Clock icon ⏱️).
2. Click the blue **+ Add Trigger** button in the bottom right corner.
3. Configure the trigger settings:
   - **Choose which function to run:** `onFormSubmitTrigger`
   - **Which deployment should run:** `Head`
   - **Select event source:** `From spreadsheet`
   - **Select event type:** `On form submit`
   - **Failure notification settings:** `Notify me immediately`
4. Click **Save**.
5. Google will ask for permission to read and edit the spreadsheet and make external web requests. Click **Advanced > Go to Untitled project (unsafe) > Allow**.

---

### Step 5: Test the Integration
1. Go back to your Google Sheet. You will now see a new menu item called **ICPF Camp Tools** in the top menu bar!
2. Click **ICPF Camp Tools > Check Backend API Health** to verify the connection.
3. Click **ICPF Camp Tools > Prepare Output Columns** to generate the colored columns:
   - `Assigned Group`
   - `Assigned Room`
   - `Badge Serial No`
   - `Allocation Status`
4. Submit a test response in your Google Form.
5. Within 1–2 seconds, watch the row in your Google Sheet fill with the camper's assigned group, room, and badge serial number!

---

## ⚡ Handling Existing / Historical Responses
If you already collected responses before setting up the trigger:
1. Open the Google Sheet.
2. Click **ICPF Camp Tools > Sync Unprocessed Registrations**.
3. The script will iterate through all existing rows that don't have an assigned group and allocate them sequentially through the backend!

