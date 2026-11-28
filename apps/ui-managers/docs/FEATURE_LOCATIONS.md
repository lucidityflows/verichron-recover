# UI Enhancement Features - Location Guide

## How to See the Features

1. **Start from Work Queue** (`/work-queue`)
2. **Click on any debtor** in the work queue list
3. This navigates to **Debtor Focus View** (`/debtors/{debtorId}/focus`)
4. All new features are visible on this page!

---

## Feature Locations in Debtor Focus View

### 1. **Compliance Warning System** (Priority 1) ✅

**Location**: Top of page, right after the header

**What to look for**:
- Large colored warning cards with FDCPA compliance flags
- Red cards for DECEASED, CEASE & DESIST
- Yellow cards for BANKRUPTCY, ATTORNEY REPRESENTED
- Blue cards for DISPUTED DEBT
- Each card shows FDCPA § legal citations

**Also appears**: Sidebar (compact badges in DebtorInfoPanel)

**When visible**: When debtor has any FDCPA flags set

---

### 2. **Enhanced Action Log Modal** (Priority 2) ✅

**Location**: Triggered by clicking quick action buttons in header

**Buttons that open it**:
- **Call** button (Phone icon)
- **Email** button (Mail icon)
- **Add Note** button (FileText icon)
- **Schedule** button (Calendar icon)

**What to look for**:
- Template selector for quick templates (10 call, 5 email, 4 note templates)
- Keyboard shortcut hints: "Ctrl+Enter to submit" and "Ctrl+T for templates"
- For calls: Outcome dropdown with promise-to-pay fields
- For calls: Promise amount/date fields appear when "Promised Payment" selected
- Auto-focus on content field
- Character counter (showing X / 2000)
- Validation errors in red

**New in this modal**:
- ✅ Real-time form validation
- ✅ Quick templates with one click
- ✅ Keyboard shortcuts (Ctrl+Enter, Escape, Ctrl+T)
- ✅ Outcome-specific fields (promise to pay)
- ✅ Unsaved changes warning

---

### 3. **Quick Payment Modal** (Priority 3) ✅

**Location**: Triggered by new "Log Payment" button in header

**Button**: **Log Payment** (DollarSign icon, secondary variant)

**What to look for**:
- Large $0.00 amount input field (auto-focused)
- **Quick amount buttons**: "25%", "50%", "Full"
- Debt selector dropdown
- **Real-time remaining balance calculation** in green box:
  - Current Balance: $X,XXX.XX
  - Payment Amount: -$XXX.XX
  - Remaining Balance: $X,XXX.XX
- **"✅ This payment will satisfy the debt in full!"** message when payment covers debt
- Payment method grid (9 options with icons):
  - 💳 Visa, Mastercard, Amex, Discover
  - 🏦 ACH / Bank Transfer
  - 📝 Check
  - 💵 Money Order, Cash
  - 📋 Other
- Optional: Transaction ID, Confirmation Number
- Notes field
- Keyboard shortcut: Ctrl+Enter to submit

**Test it**: Enter an amount equal to debt balance and watch the green "paid in full" indicator appear!

---

### 4. **Communication Templates System** (Priority 4) ✅

**Location**: Inside Enhanced Action Log Modal when actionType is 'email' or 'sms'

---

### 5. **Global Keyboard Shortcuts** (Priority 5) ✅

**Location**: Active throughout entire Debtor Focus View page

**Visual Indicators**:
- Keyboard shortcut badges on buttons (e.g., ⌃P, ⌃N)
- "?" button in header to open shortcuts help
- Help modal accessible via pressing "?" key

**Available Shortcuts**:

| Shortcut | Action | Category |
|----------|--------|----------|
| **Ctrl+N** | Add note | Actions |
| **Ctrl+P** | Log payment | Actions |
| **Ctrl+Shift+C** | Log call | Actions |
| **Ctrl+Shift+E** | Send email | Actions |
| **?** | Show keyboard shortcuts help | Help |

**What to look for**:
- Small kbd badges on button labels (⌃N, ⌃P, ⌃⇧C, ⌃⇧E)
- Small "?" button at end of quick actions
- Press "?" anywhere on page to open help modal
- Help modal shows all shortcuts organized by category
- Platform-specific modifier keys (⌘ on Mac, Ctrl on Windows/Linux)

**Test it**:
1. Press **?** to open shortcuts help modal
2. Press **Ctrl+P** to open payment modal
3. Press **Ctrl+N** to open add note modal
4. Hover over buttons to see tooltips with shortcuts

**Smart Features**:
- ✅ Shortcuts respect compliance flags (call/email disabled if blocked)
- ✅ Shortcuts work from anywhere on the page
- ✅ Shortcuts are disabled when typing in input fields
- ✅ Visual feedback with kbd badges on buttons
- ✅ Categorized help system (Navigation, Actions, Help)

---

## Feature Locations in Debtor Focus View (Updated)

**How to access**:
1. Click **Email** button in header
2. Look for highlighted section at top of modal:
   - **📧 Email Templates** or **💬 SMS Templates** section
   - Blue/purple gradient background
   - **"Browse Templates"** button

**Template Browser Features**:
- Split-panel UI (template list + preview)
- Search bar to filter templates
- Hover over template to see preview
- Click to select template

**Template Preview Features**:
- Variable input form (15 variables):
  - debtor_name, account_number, balance, etc.
  - Pre-populated from debtor data
  - Can be edited before using
- Real-time preview of email/SMS
- Edit mode to customize content
- SMS character counter (warns if >160)
- "Use This Template" button fills subject + body

**Available Templates**:
- **6 Email Templates**:
  - Initial Contact - Debt Validation Notice
  - Friendly Payment Reminder
  - Payment Received Confirmation
  - Promise to Pay Follow-Up
  - Settlement Opportunity
  - Debt Validation Response
- **3 SMS Templates**:
  - SMS Payment Reminder
  - SMS Promise Reminder
  - SMS Payment Confirmation
- **All FDCPA Compliant** ✓ badge

---

## Testing Checklist

### Test Compliance Warnings:
- [ ] Navigate to debtor with FDCPA flags
- [ ] See colored warning cards at top
- [ ] See compact badges in sidebar

### Test Action Log Modal:
- [ ] Click "Call" button
- [ ] See template selector
- [ ] Press Ctrl+T to toggle templates
- [ ] Select "Promised Payment" outcome
- [ ] See promise amount/date fields appear
- [ ] Press Ctrl+Enter to submit

### Test Payment Modal:
- [ ] Click "Log Payment" button
- [ ] Amount field should be auto-focused
- [ ] Click "Full" quick button
- [ ] See remaining balance calculation
- [ ] See "paid in full" message if amount = balance
- [ ] Select payment method from grid
- [ ] Press Ctrl+Enter to submit

### Test Communication Templates:
- [ ] Click "Email" button
- [ ] See "Browse Templates" button in blue section
- [ ] Click to open template selector
- [ ] Search for "payment"
- [ ] Hover to preview template
- [ ] Click to select template
- [ ] Fill in variables (should be pre-populated)
- [ ] See preview update in real-time
- [ ] Click "Use This Template"
- [ ] Subject and body should populate in modal

### Test Global Keyboard Shortcuts:
- [ ] See kbd badges on buttons (⌃N, ⌃P, ⌃⇧C, ⌃⇧E)
- [ ] See "?" button in header quick actions
- [ ] Press **?** key to open shortcuts help modal
- [ ] See shortcuts organized by category (Actions, Help)
- [ ] Press **Ctrl+P** to open payment modal
- [ ] Press **Esc** to close modal
- [ ] Press **Ctrl+N** to open add note modal
- [ ] Press **Ctrl+Shift+C** to open call modal (if not blocked)
- [ ] Verify shortcuts don't trigger when typing in input fields
- [ ] Hover over buttons to see tooltip with shortcut

---

## Quick Access Summary

**From Work Queue → Click Debtor → You'll see:**

1. **Top of page**: Compliance warnings (if applicable)
2. **Header buttons**:
   - 📞 Call → Enhanced modal with call templates
   - 📧 Email → Enhanced modal with **Email Templates System**
   - 💵 **Log Payment** → **Quick Payment Modal**
   - 📝 Add Note → Enhanced modal with note templates
   - 📅 Schedule → Enhanced modal with follow-up fields
3. **Sidebar**: Compact compliance badges

**All features use:**
- Keyboard shortcuts (Ctrl+Enter, Escape, Ctrl+T)
- Real-time validation
- Auto-focus on primary fields
- Visual feedback and animations

---

## If You Don't See Features

**Possible issues**:
1. ❌ Not navigating to Debtor Focus View
   - **Solution**: Click on a debtor in the work queue
2. ❌ Dev server not running
   - **Solution**: Run `pnpm dev` in ui-organizations
3. ❌ Browser cache
   - **Solution**: Hard refresh (Ctrl+Shift+R) or clear cache
4. ❌ TypeScript errors
   - **Solution**: Fixed! (handleCloseWithConfirmation error resolved)

**To verify routing**:
- URL should be: `/debtors/{uuid}/focus`
- Not `/debtors` or `/work-queue`
