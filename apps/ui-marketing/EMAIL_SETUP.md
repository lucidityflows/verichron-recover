# Contact Form Email Setup (Google Workspace Edition)

The contact form uses **EmailJS** to bridge your frontend directly to your Google Workspace account (`info@verichroninc.com`).

## Quick Setup (5 minutes)

### Step 1: Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up (Free tier is fine for starting).

### Step 2: Connect Google Workspace
1. In the EmailJS dashboard, go to **Email Services**.
2. Click **Add New Service**.
3. Select **Gmail**.
4. Click **Connect Account** and sign in with `info@verichroninc.com`.
5. Make sure "Send email on your behalf" is checked during the Google authorization.
6. Click **Create Service**.
7. **Copy the Service ID** (e.g., `service_xyz123`).

### Step 3: Create Admin Notification Template (Template 1)
This notifies **YOU** when a customer submits the form.

1. Go to **Email Templates** > **Create New Template**.
2. **Name:** "Admin Notification"
3. **Subject:** `{{subject}} - Contact Form Submission`
4. **Content:**
   ```html
   New contact form submission from Verichron website:
   
   From: {{from_name}}
   Email: {{from_email}}
   Subject: {{subject}}
   
   Message:
   {{message}}
   ```
5. **Save** and **Copy Template ID** (e.g., `template_admin123`).

### Step 4: Create Auto-Reply Template (Template 2)
This confirms receipt to the **CUSTOMER**.

1. Go to **Email Templates** > **Create New Template**.
2. **Name:** "Customer Auto-Reply"
3. **Subject:** `Re: {{subject}} - Verichron Inc.`
4. **Content:**
   ```html
   Hi {{to_name}},

   Thanks for reaching out to Verichron.

   I have received your message regarding "{{subject}}" and will review it shortly. You can expect a response within 24 hours.

   Best regards,

   Robert Torres
   Founder & CEO, Verichron Inc.
   https://verichroninc.com
   ```
5. **Important Settings (Right Panel):**
   - **To Email:** `{{to_email}}` (This is critical - it targets the user)
   - **From Name:** `Robert Torres`
   - **From Email:** `info@verichroninc.com`
6. **Save** and **Copy Template ID** (e.g., `template_reply456`).

### Step 5: Get Public Key
1. Go to **Account** > **General**.
2. Copy your **Public Key**.

### Step 6: Configure Environment
Add these to your deployment settings (Vercel/Netlify) or local `.env`:

```bash
VITE_EMAILJS_SERVICE_ID=service_xyz123
VITE_EMAILJS_TEMPLATE_ID=template_admin123
VITE_EMAILJS_AUTO_REPLY_TEMPLATE_ID=template_reply456
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

## Troubleshooting
- **Emails going to Spam?** Since you are sending *from* your own Google Workspace domain *to* yourself (or others), deliverability is usually very high. If issues arise, check your SPF/DKIM records in Google Workspace admin, but usually, this works out of the box.