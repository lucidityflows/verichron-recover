# Comprehensive Event & Notification System Roadmap

**Status:** PROPOSED
**Target Version:** Post-Refactor v2.0
**Author:** Gemini

---

## 1. Executive Summary

This document outlines a strategic roadmap for evolving our real-time notification system. The vision is to move beyond simple alerts to a sophisticated, tiered, and role-based event-driven architecture. This system will reduce noise, deliver actionable insights to the right users, and create a foundation for future automation.

This feature will be implemented **after** the current major refactoring is complete and the system has been stabilized.

### Core Principles

- **Signal vs. Noise:** Differentiate between critical alerts and informational updates.
- **Role-Specific Delivery:** Deliver information that is relevant to the recipient's role (Admin, Manager, Support Staff).
- **Actionable Insights:** Notifications should empower users to take immediate, informed action.
- **System Automation:** Use events as internal hooks to trigger automated workflows, not just notify humans.

---

## 2. Proposed Architecture: A Tiered & Targeted Strategy

We will categorize all business events into four distinct tiers, each with a specific audience and delivery mechanism.

### Tier 1: Critical Security & Health Alerts

- **Audience:** Company Admins, System Admins.
- **Delivery:** Real-time, high-priority push (WebSocket) triggering prominent UI alerts (e.g., modals, persistent banners).
- **Examples:**
  - **Anomalous Login:** "User 'Bob' just logged in from a new country (Vietnam)."
  - **Privilege Escalation:** "User 'Carol' has requested 'COMPANY_ADMIN' role access."
  - **System Health Warning:** "High traffic volume detected. Potential DDoS attack."

### Tier 2: Tactical Debtor & Portfolio Events

- **Audience:** Assigned Support Staff, Portfolio Managers.
- **Delivery:** Real-time, targeted push (WebSocket) with authorization to ensure users only see events for entities they manage.
- **Examples:**
  - **High-Value Payment:** "A payment of $15,000 was received from 'John Smith' (Portfolio 'Q4 High-Risk')."
  - **Key Debtor Action:** "Debtor 'Jane Doe' has formally requested debt verification via the portal."
  - **Engagement Signal:** "Debtor 'Sam Jones', previously unresponsive, just viewed their statement online."

### Tier 3: Aggregated Trend & Performance Insights

- **Audience:** Managers, Company Admins.
- **Delivery:** Low-priority, batched updates (e.g., every 15-30 minutes) displayed in a dedicated **Notifications Dashboard**.
- **Examples:**
  - **Performance vs. Projections:** "Collections are trending 10% above projection for the month."
  - **Predictive Warning:** "Portfolio 'Q3 Medical' is underperforming its recovery target by 25%."
  - **Team Performance:** "Support team 'Alpha' has the lowest contact-to-payment-plan conversion rate this week."

### Tier 4: Backend Automation & System Hooks

- **Audience:** Other backend services (not humans).
- **Delivery:** Internal backend event bus (e.g., NestJS `EventEmitterModule` or Redis Pub/Sub).
- **Examples:**
  - **`ContactLog` Creation:** A new `ContactLog` entry for an outgoing email is created.
  - **Trigger 1 (Auto-Mailer):** A service listening for the event knows not to send a duplicate email for 24 hours.
  - **Trigger 2 (Analytics):** A service listens and updates the debtor's "responsiveness score" based on their reply.

---

## 3. Required Technical Components & Features

To implement this system, the following new components will be required:

- **Backend Infrastructure:**
  - **Event Bus (Pub/Sub):** An internal, in-process event bus (e.g., `EventEmitterModule`) to decouple event producers (services) from consumers (listeners, gateways). Can be scaled to Redis later if needed.
  - **Queueing System:** A message queue (e.g., BullMQ) for handling asynchronous, resource-intensive tasks triggered by events, such as sending emails or generating reports.
  - **WebSocket Gateway:** A NestJS gateway (`@nestjs/websockets`) to manage real-time connections and push Tier 1 & 2 events to authorized clients.
  - **New Entities & DTOs:**
    - `NotificationEntity`: To persist notifications for the dashboard/center.
    - `ContactLogEntity`: To store all debtor communications.
    - Corresponding DTOs for both.
  - **New Services:**
    - `NotificationService`: Manages the creation and retrieval of notifications.
    - `TrendAnalysisService`: A scheduled service (`@nestjs/schedule`) to perform the Tier 3 aggregations.

- **Frontend Infrastructure:**
  - **Notifications Dashboard:** A new UI page to display and filter Tier 3 aggregated insights.
  - **Notification Center:** A UI component (e.g., a dropdown panel) to show a history of recent Tier 1 & 2 alerts.
  - **WebSocket Client Service:** A service to manage the Socket.IO connection, authentication, and event handling.

- **Seeding & Mock Data:**
  - The mock data generator will be updated to produce realistic `ContactLog` entries and a stream of `BusinessEvent` data to facilitate development and testing.

---

## 4. Automation Ideas (Future Enhancements)

This event-driven architecture unlocks powerful automation capabilities, which can be implemented after the core system is in place:

- **Automated Communications:**
  - **Trigger:** `debtor.firstLogin` event.
  - **Action:** Queue a "Welcome to the Portal" email.
  - **Trigger:** `debt.dueDate.approaching` (generated by a daily job).
  - **Action:** Queue a payment reminder email/SMS.

- **Recommended Agent Actions:**
  - **Trigger:** Debtor shows multiple high-engagement signals (Tier 2 events).
  - **Action:** Create a high-priority task in the agent's dashboard: "Recommend calling 'Jane Doe'."
  - **Trigger:** A debtor with a history of failed payments makes a successful partial payment.
  - **Action:** Create a task: "Recommend offering a payment plan to 'John Smith'."

---

## 5. Phased Implementation Plan

This project will commence after the current DTO and entity refactoring is complete and the system is stable.

- **Phase 1: Backend Foundation:** Implement the internal event bus, WebSocket gateway, and the new `ContactLog` and `Notification` entities, DTOs, and services.
- **Phase 2: Tier 4 & Automation Hooks:** Implement the creation of `ContactLog` entries from services (e.g., email service) and emit the corresponding internal events.
- **Phase 3: Tier 1 & 2 (Real-Time Alerts):** Implement the critical security and tactical debtor alerts, including the WebSocket authorization logic to target the correct users.
- **Phase 4: Tier 3 (Dashboard & Trends):** Build the backend aggregation service (`TrendAnalysisService`) and the frontend dashboard to display the insights.
- **Phase 5: Advanced Automation:** Begin implementing the "Recommended Action" features.
