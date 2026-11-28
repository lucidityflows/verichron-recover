API Voice (Telephony & VoIP Connector)

📖 Overview

The api-voice microservice is the dedicated gateway for all telephony operations. It acts as the bridge between the Debt Collection Platform and the VoIP provider (e.g., Twilio).

It isolates the complexity of real-time voice communications, managing client-side tokens for the browser softphone, handling webhooks for call lifecycle events, and managing call artifacts (recordings).

🎯 Bounded Context Responsibilities

Token Vending: Generating ephemeral JWT capability tokens for the frontend ui-organizations to initialize the Twilio Voice SDK (Click-to-Call).

Call Control: Managing the TwiML (Twilio Markup Language) instructions that tell the provider how to route the call (e.g., "Dial this debtor number," "Record this call").

Webhook Handling: Receiving and processing real-time status updates (Ringing, Answered, Completed, Failed).

Recording Management: Securely storing call recording references and generating signed URLs for playback in the Debtor 360 Timeline.

Compliance: Enforcing "Do Not Call" checks instantly before dialing.

🏗 Architecture & Modules

1. src/tokens

Handles secure generation of VoIP access tokens.

Logic: Validates the Agent's identity via api-users (using the JWT from the request) and issues a Twilio Access Token granting them the ability to make outbound calls.

2. src/webhooks

The public-facing entry point for the VoIP provider.

Endpoints:

/voice/webhooks/status: Receives CallStatus updates.

/voice/webhooks/recording: Receives the URL of the completed recording.

Security: Must validate the X-Twilio-Signature to ensure requests are legitimate.

3. src/calls

Manages the domain entities for calls.

Entity: CallLog

sid: Provider Session ID.

debtorId: Linked debtor.

agentId: The collector who made the call.

duration: Call length.

disposition: Outcome (e.g., "Left Voicemail", "Promise to Pay").

recordingUrl: Secure reference.

4. src/controls

Logic for Click-to-Call and basic IVR.

Responsibility: When the browser SDK starts a call, Twilio requests TwiML from this module. This module instructs Twilio to:

Enable call recording.

Dial the debtor's phone number.

Set caller ID to the Organization's verified number.

🔌 API Endpoints

Frontend (Agent UI) Consumption

Method

Endpoint

Description

GET

/voice/token

Returns a capability token for the browser softphone.

POST

/voice/calls

Initiates an outbound call (Click-to-Call trigger).

GET

/voice/calls/{debtorId}

Returns call history for the Timeline view.

Provider (Twilio) Consumption

Method

Endpoint

Description

POST

/webhooks/voice

Returns TwiML instructions for a new call.

POST

/webhooks/status

Updates call status (Queued -> In-Progress -> Completed).

POST

/webhooks/recording

Receives final recording file metadata.

📡 Event Integration

Published Events

voice.call-started (Updates Agent Status in api-users to "On Call").

voice.call-completed (Triggers api-workflows to check if a "Post-Call Wrap-up" task is needed).

voice.recording-ready (Updates the Timeline).

🛡 Compliance & Security

Recording Storage: Recordings are strictly scoped to OrganizationID.

DNC Check: Before issuing TwiML to dial, this service checks api-communications or api-debtors for "Do Not Call" flags. If flagged, it rejects the call.

🛠 Tech Stack

Framework: NestJS

Provider: Twilio (Voice API & Client SDK)

Storage: S3 (for archiving recordings) or Twilio Cloud Storage.

Database: PostgreSQL (Call Metadata).