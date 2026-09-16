# 🛡️ VeilAgent

## Privacy-First Autonomous Browser Agent

> **See less. Share less. Act safely.**

VeilAgent is a privacy-first autonomous browser agent designed to interact with webpages while minimizing the exposure of sensitive information.

The project combines a **Chrome Manifest V3 browser extension** with a **FastAPI backend**. The browser extension observes webpages locally, extracts relevant webpage structure, detects potentially sensitive information, redacts sensitive values before transmission, performs an authorization check, and sends a minimized representation of the webpage to the backend.

The backend authenticates the requesting client, verifies authorization, and uses a deterministic reasoning engine to decide the next browser action. Before an action is executed, it passes through a separate action-validation layer.

For high-impact operations such as financial transfers, VeilAgent introduces a **human confirmation boundary**. The agent can prepare a transaction and open the review stage, but it does not autonomously perform the final confirmation.

The project includes **SecureBank**, a simulated banking website created specifically for demonstrating the system.

> ⚠️ **Important:** SecureBank is completely fictional. It does not connect to any real bank, banking API, financial account, or payment system. No real money is transferred.

---

# 🌐 Live Prototype

## Live Demo

**https://veilagent-1.onrender.com/**

The live prototype provides the simulated SecureBank environment used for demonstration.

### Demo Credentials

```text
Username: demo
Password: demo123

These credentials are intended only for the demonstration environment.

💻 Source Code

GitHub Repository:

https://github.com/jroychowdhury/VeilAgent

📖 Table of Contents
Overview
The Problem
Our Solution
Core Idea
Key Features
System Architecture
Complete Processing Pipeline
SEE — Local Page Perception
DETECT — Sensitive Information Detection
REDACT — Local Data Sanitization
ACCESS CHECK — Authentication and Authorization
SEND — Sanitized Context
REASON — Decision Making
VALIDATE — Action Validation
ACT — Browser Execution
Agent Loop
Human Confirmation Boundary
Privacy Architecture
Security Architecture
Authentication
Authorization
Action Security
Fail-Closed Design
Audit Logging
SecureBank
Example Workflow
Security Demonstration
Privacy Demonstration
Technology Stack
Project Structure
Component Description
Installation
Running Locally
Chrome Extension Setup
Using VeilAgent
Recommended Demo
Testing
Threat Model
Advantages
Limitations
Future Scope
LLM Integration
Production Considerations
Design Principles
Project Philosophy
Conclusion
Disclaimer
🔎 Overview

Autonomous browser agents are designed to understand webpages and perform tasks on behalf of users.

For example, a user could ask:

Open the transfer page.

or:

Transfer ₹5000 to my beneficiary.

A browser agent needs to understand the webpage before it can perform these tasks.

However, modern webpages can contain a large amount of information that is completely unrelated to the user's current task.

A banking page may contain:

Name
Account Number
IFSC Code
Card Number
Email Address
Phone Number
PAN
Balance
Transaction History
Beneficiary Information

The agent may only need to know that a button called:

Transfer Money

exists.

Sending the entire webpage to a remote reasoning system would therefore expose much more information than is necessary.

VeilAgent addresses this problem by placing a privacy boundary before the reasoning layer.

Instead of:

Webpage
   ↓
Reasoning System

VeilAgent follows:

Webpage
   ↓
Local Detection
   ↓
Local Redaction
   ↓
Sanitized Context
   ↓
Reasoning

The project also places a separate authority boundary between reasoning and browser execution.

Reasoning
   ↓
Action Proposal
   ↓
Action Validation
   ↓
Browser Execution

This means that the component deciding what to do is not automatically trusted with unrestricted control over the browser.

🎯 The Problem

There are two important security and privacy challenges associated with autonomous browser agents.

1. Unnecessary Data Exposure

A webpage can contain sensitive information that is irrelevant to the user's task.

For example:

Task:
Open the transfer page

The reasoning system does not necessarily need access to:

Account Number
Card Number
PAN
Phone Number
Email
Balance

If unnecessary information is transmitted, the amount of sensitive data exposed to downstream systems increases.

2. Excessive Agent Authority

An autonomous agent may be capable of performing browser actions.

But not every action has the same consequence.

For example:

Click "Transactions"

is fundamentally different from:

Click "Confirm Transfer"

The second action can have a significantly greater consequence.

Therefore, a safe browser agent should distinguish between:

Low-impact actions

and:

High-impact or irreversible actions
💡 Our Solution

VeilAgent introduces two major control boundaries.

Information Boundary

Sensitive information is detected and redacted locally before reasoning.

Raw Webpage
     ↓
Sensitive Data Detection
     ↓
Local Redaction
     ↓
Minimized Context
     ↓
Reasoning System
Authority Boundary

The reasoning system proposes an action, but the action is independently validated before it reaches the browser executor.

Reasoning
     ↓
Action Proposal
     ↓
Action Validator
     ↓
Policy Check
     ↓
Browser Executor

For financial operations, a third boundary is added:

Action Preparation
     ↓
Review Screen
     ↓
Human Confirmation

The final decision remains with the user.

🧠 Core Idea

The fundamental design principle behind VeilAgent is:

Give the agent only the information and authority it needs to complete the task.

This can be divided into two questions:

Information

What does the agent actually need to see?

Authority

What does the agent actually need to be allowed to do?

VeilAgent attempts to answer both questions before autonomous execution takes place.

⭐ Key Features
🔐 Privacy-First Processing

Sensitive information is detected on the user's device before the reasoning context is sent to the backend.

🧹 Data Minimization

Only the webpage information required for reasoning is intended to be included in the sanitized context.

🤖 Browser Automation

The agent can interpret webpage structure and perform permitted actions such as navigation, clicking, and form filling.

🔎 PII Detection

The extension identifies potentially sensitive information using:

Regular expressions
DOM metadata
Field names
Labels
Input context
Heuristics
Confidence thresholds
🛡️ Authentication

Backend requests use bearer-token authentication.

👤 Role-Based Authorization

Authenticated clients are assigned roles, such as:

customer
admin

and protected endpoints check whether the client's role is authorized.

🚫 Action Validation

The reasoning layer does not receive unrestricted browser control.

Proposed actions are checked before execution.

🧑‍💻 Human-in-the-Loop

High-impact financial actions stop at a human confirmation boundary.

📋 Audit Logging

Allowed, blocked, and forbidden security requests can be recorded in an audit trail.

🔒 Fail-Closed Behavior

If a critical privacy or security condition cannot be safely satisfied, the system can stop instead of continuing under an unsafe assumption.

🏦 Simulated Banking Environment

SecureBank provides a controlled environment for demonstrating privacy, automation, security, and human confirmation without using real financial infrastructure.

🏗️ System Architecture

VeilAgent consists primarily of two major parts:

┌─────────────────────────────────────────────────┐
│              USER'S BROWSER                    │
│                                                 │
│          Chrome Manifest V3 Extension          │
│                                                 │
│  ┌────────┐                                    │
│  │  SEE   │                                    │
│  └───┬────┘                                    │
│      ↓                                          │
│  ┌────────┐                                    │
│  │ DETECT │                                    │
│  └───┬────┘                                    │
│      ↓                                          │
│  ┌────────┐                                    │
│  │ REDACT │                                    │
│  └───┬────┘                                    │
│      ↓                                          │
│  ┌──────────────┐                              │
│  │ ACCESS CHECK │                              │
│  └──────┬───────┘                              │
│         │                                       │
└─────────┼───────────────────────────────────────┘
          │
          │ Sanitized Context
          ▼
┌─────────────────────────────────────────────────┐
│                 FASTAPI BACKEND                 │
│                                                 │
│        Authentication + Authorization           │
│                       ↓                         │
│                  Reasoning Engine               │
│                       ↓                         │
│                 Action Proposal                 │
└──────────────────────┬──────────────────────────┘
                       │
                       │ Proposed Action
                       ▼
┌─────────────────────────────────────────────────┐
│              USER'S BROWSER                    │
│                                                 │
│             Action Validation                   │
│                       ↓                         │
│                  Execution                      │
│                       ↓                         │
│              Page Observation                   │
│                       ↓                         │
│                 Agent Loop                      │
└─────────────────────────────────────────────────┘
🔄 Complete Processing Pipeline

The core VeilAgent pipeline is:

SEE
 ↓
DETECT
 ↓
REDACT
 ↓
ACCESS CHECK
 ↓
SEND
 ↓
REASON
 ↓
VALIDATE
 ↓
ACT
 ↓
SEE AGAIN
 ↓
REPEAT

Each stage has a specific responsibility.

Stage	Purpose
SEE	Understand the current webpage
DETECT	Identify potentially sensitive information
REDACT	Remove or mask sensitive information
ACCESS CHECK	Verify client authorization
SEND	Send minimized context
REASON	Decide the next action
VALIDATE	Check whether the action is allowed
ACT	Perform the browser action
SEE AGAIN	Observe the updated webpage
1. SEE — Local Page Perception

The first stage is SEE.

The browser extension reads the current webpage and extracts information relevant to browser automation.

The system can identify:

Links
Buttons
Input fields
Select elements
Labels
Element IDs
Names
Placeholders
ARIA labels
Current URL
Page title
Relevant webpage text

The main components involved include:

extension/content/content.js
extension/content/domExtractor.js
extension/background.js
Example

Suppose SecureBank contains:

Transfer Money

Beneficiary:
[ Priya Nair ]

Amount:
[          ]

[ Review Transfer ]

The extension can represent the interactive page structure approximately as:

Transfer Money → link
Beneficiary → select
Amount → input
Review Transfer → button

This structured representation gives the reasoning engine information about what actions are available without requiring the entire raw webpage to be sent.

2. DETECT — Sensitive Information Detection

After the page has been observed, VeilAgent searches for potentially sensitive information.

The primary detector is:

extension/detection/piiDetector.js

The prototype uses multiple signals.

Regular Expressions

Regular expressions, commonly called regex, are patterns used to recognize structured strings.

They can help identify values such as:

Email addresses
Phone numbers
Card numbers
PAN numbers
IFSC codes
Account numbers

For example, an email has a recognizable structure:

name@example.com

A card number may also follow a recognizable numeric pattern.

DOM Metadata

The system also examines webpage metadata.

Consider:

<input name="account_number">

The name:

account_number

provides contextual evidence that the field contains sensitive information.

Similarly:

<input name="card_number">

can provide a strong signal for card information.

Heuristics

A heuristic is a rule or contextual clue used to make an informed classification.

VeilAgent can combine information such as:

Field name
+
Label
+
HTML element
+
Value format
+
Page context

to determine whether a value is likely to be sensitive.

🔎 Sensitive Information Categories

The prototype can detect categories including:

ACCOUNT_NUMBER
IFSC
CARD_NUMBER
PAN
EMAIL
PHONE
PASSWORD
NAME
BALANCE

The exact detections depend on the structure and content of the webpage.

📊 Confidence Threshold

Detections are associated with confidence values.

For example:

ACCOUNT_NUMBER → 0.99
IFSC           → 0.99
EMAIL          → 0.96

The prototype uses:

0.80

as the important confidence threshold.

Conceptually:

Confidence >= 0.80
        ↓
Considered sensitive
        ↓
Redact

This allows the privacy policy to distinguish between weak and strong detection signals.

3. REDACT — Local Data Sanitization

Once sensitive information is detected, VeilAgent applies local redaction.

The relevant component is:

extension/redaction/redactor.js

Redaction means replacing or masking sensitive information so that the original value is no longer available in the sanitized representation.

Example
Original webpage
Name: Priya Nair

Account Number: 998877665544

IFSC: DEMO0009988

Email: priya@example.com

Phone: 9876543210
Sanitized representation
Name: [REDACTED]

Account Number: [REDACTED]

IFSC: [REDACTED]

Email: [REDACTED]

Phone: [REDACTED]

The goal is to prevent raw sensitive values from unnecessarily entering the reasoning context.

🧹 Data Minimization

Data minimization means reducing the amount of information provided to a system to what is actually necessary for the task.

For example:

User Task:

Open the transfer page

The reasoning engine may need:

Transfer Money link exists

It does not necessarily need:

Account Number
Card Number
PAN
Email
Phone
Balance

Therefore:

Raw Webpage
      ↓
Privacy Processing
      ↓
Minimized Context

This is one of the central privacy concepts behind VeilAgent.

👁️ Visual Privacy

Webpage privacy is not limited to text and DOM elements.

Sensitive information can also appear visually in screenshots.

For example:

Account Number: 998877665544

could be visible inside a screenshot even if the DOM representation is sanitized.

VeilAgent therefore includes:

extension/detection/visionDetector.js

as a visual privacy component.

The intended visual workflow is:

Visual Page
     ↓
Sensitive Region Detection
     ↓
Region Mapping
     ↓
Redaction
     ↓
Privacy Check

The system is designed to avoid treating an unavailable or unsafe screenshot as automatically safe.

Screenshot Safety

Screenshot capture depends on browser permissions and runtime conditions.

The current prototype has demonstrated environments where screenshot capture can fail.

When the visual privacy stage cannot safely establish the required condition, the system is designed to fail closed rather than continue while assuming the screenshot is safe.

The main demonstrated privacy mechanism remains the DOM/text sanitization pipeline.

4. ACCESS CHECK — Authentication and Authorization

After privacy processing, VeilAgent performs an access check before communicating with the backend.

Relevant components include:

extension/security/auth.js
extension/security/accessMonitor.js
backend/security.py

There are two different concepts:

Authentication

and:

Authorization
🔑 Authentication

Authentication answers:

Who is making this request?

VeilAgent's prototype uses bearer tokens for backend authentication.

Demo clients include:

Client	Role	Demonstration Token
VEIL-001	customer	veil-demo-token-001
VEIL-ADM	admin	veil-admin-token-002

These are prototype demonstration credentials.

A production implementation would require proper credential issuance, secure storage, expiration, rotation, and identity management.

👤 Authorization

Authorization answers:

Is this authenticated client allowed to perform this operation?

For example:

Client: VEIL-001
Role: customer

may be allowed to access:

/agent/reason

but should not automatically be allowed to access:

/admin/accounts

The backend therefore checks the client's role before granting access to protected resources.

🧩 Role-Based Access Control

This approach is commonly called:

RBAC — Role-Based Access Control

Instead of assigning every permission individually, permissions are associated with roles.

The prototype demonstrates roles such as:

customer
admin

This creates a basic separation of privileges.

5. SEND — Sanitized Context

Only after local privacy processing and access checks does the client send reasoning context to the backend.

The conceptual flow is:

Webpage
   ↓
Detection
   ↓
Redaction
   ↓
Authorization
   ↓
Sanitized Context
   ↓
Backend

The reasoning request can contain information such as:

Current URL
Page title
Interactive elements
Element labels
Element types
Sanitized webpage text
Redaction count
Privacy state
Relevant contextual information

The purpose is to provide enough information for the reasoning engine to make a useful decision without unnecessarily transmitting sensitive values.

📦 Example Sanitized Context

A simplified request can look conceptually like:

{
  "url": "/transfer.html",
  "page_title": "Transfer money - SecureBank",
  "redactions": 3,
  "screenshot_transmitted": false,
  "elements": [
    {
      "kind": "link",
      "label": "Dashboard"
    },
    {
      "kind": "link",
      "label": "Transfer money"
    },
    {
      "kind": "input",
      "label": "Amount",
      "name": "amount"
    }
  ]
}

The important point is that the reasoning context describes the webpage while sensitive values can remain redacted.

6. REASON — Decision Making

The reasoning component is located at:

backend/reasoning.py

The current implementation uses a:

Deterministic rule-based reasoning engine

It is important to clarify that the current prototype does not rely on a general-purpose external LLM for its core reasoning.

The reasoner receives:

User Task
+
Sanitized Page Context

and proposes the next action.

🧠 Example Reasoning

User:

Open the transfer page

Sanitized webpage:

Transfer Money → link

Reasoning:

The transfer page is available.

Proposed Action:
Click "Transfer Money"

The proposed action is then passed to the validation layer.

🤖 Why Rule-Based Reasoning?

A deterministic reasoner provides several benefits for a prototype:

Predictable behavior
Reproducible demonstrations
Easier debugging
No external model dependency
No API cost
Easier security testing
Easier verification of action boundaries

The architecture is intentionally designed so that the reasoning layer can later be replaced by a more capable model.

7. VALIDATE — Action Validation

A critical part of VeilAgent is that the reasoning layer does not receive unrestricted control over the browser.

The proposed action is passed through:

extension/agent/actionParser.js

The flow becomes:

Reasoning
    ↓
Action Proposal
    ↓
Action Validator
    ↓
Allowed / Blocked
    ↓
Browser Executor
🛡️ Why Validation Is Important

A reasoning system may make mistakes.

It could:

Select the wrong element
Misunderstand the task
Misinterpret page state
Choose an unintended action
Follow malicious instructions present on a webpage

Therefore, reasoning output should not automatically equal browser authority.

VeilAgent separates:

Decision

from:

Execution
🚫 Restricted Actions

The action-validation layer contains protections around high-impact operations.

Examples include actions involving:

Confirm Transfer
Confirm Payment
Authorize Transfer
Authorize Payment
Send Money
Pay Now
Delete
Close Account
OTP-related actions

The purpose is to prevent the autonomous loop from blindly completing irreversible operations.

8. ACT — Browser Execution

After an action passes validation, the extension executes it.

The main execution component is:

extension/content/executor.js

The system can perform actions such as:

CLICK
FILL
NAVIGATE
Example

Reasoning proposes:

Fill Amount = 5000

The validator checks the action.

If allowed:

Validator
    ↓
Allowed
    ↓
Executor
    ↓
Amount field filled with 5000

The browser then changes state.

The agent observes the new state again.

🔄 The Agent Loop

Webpages are dynamic.

After every browser action, the page may change.

For example:

Transfer Page

may become:

Transfer Review Page

after clicking:

Review Transfer

Therefore, VeilAgent operates as an iterative loop.

SEE
 ↓
DETECT
 ↓
REDACT
 ↓
ACCESS CHECK
 ↓
SEND
 ↓
REASON
 ↓
VALIDATE
 ↓
ACT
 ↓
SEE AGAIN
 ↓
DETECT AGAIN
 ↓
REASON AGAIN
 ↓
ACT AGAIN

This allows the agent to react to the updated state rather than assuming that the webpage remains unchanged.

🧑‍💻 Human Confirmation Boundary

One of the most important safety mechanisms in the prototype is the human confirmation boundary.

Consider:

Transfer ₹5000 to my beneficiary

VeilAgent can perform preparation steps:

Open Transfer Page
       ↓
Select / identify beneficiary
       ↓
Fill amount
       ↓
Click Review Transfer

Then it stops.

Review Transfer Screen
       ↓
HUMAN CONFIRMATION REQUIRED

The agent does not continue to:

Confirm Transfer

or:

Send Money

automatically.

🛡️ Why Human Confirmation?

Financial actions can have significant consequences.

An autonomous system may misunderstand:

User intent
Beneficiary
Amount
Page state
Button meaning
Confirmation wording

The human confirmation boundary therefore separates:

Automated Preparation

from:

Final User Authorization

This is an example of:

Human-in-the-loop automation

🔐 Privacy Architecture

The privacy architecture can be summarized as:

                 RAW WEBPAGE
                      │
                      ▼
              LOCAL PERCEPTION
                      │
                      ▼
               PII DETECTION
                      │
                      ▼
               CONFIDENCE CHECK
                      │
                      ▼
              LOCAL REDACTION
                      │
                      ▼
             SANITIZED CONTEXT
                      │
                      ▼
                  BACKEND

The important design principle is that privacy processing occurs before the reasoning request is sent.

🔒 Security Architecture

VeilAgent uses multiple security layers.

┌─────────────────────────────┐
│        WEBPAGE              │
└──────────────┬──────────────┘
               ↓
        Local Detection
               ↓
        Local Redaction
               ↓
      Authentication
               ↓
       Authorization
               ↓
     Sanitized Context
               ↓
          Reasoning
               ↓
      Action Validation
               ↓
          Execution
               ↓
    Human Confirmation
               ↓
        Audit Logging

This is an example of a defense-in-depth architecture.

🧱 Defense in Depth

Defense in depth means that the system does not rely on one single security mechanism.

For example:

PII Detection

does not replace:

Authentication

and authentication does not replace:

Authorization

Authorization does not replace:

Action Validation

and action validation does not replace:

Human Confirmation

Each layer addresses a different risk.

🔑 Authentication Demonstration

The prototype demonstrates invalid and valid authentication cases.

Invalid Token
Invalid Token
     ↓
/agent/reason
     ↓
401 Unauthorized
     ↓
BLOCKED
Valid Token
Valid Token
     ↓
Authenticated Client
     ↓
Continue to authorization
👤 Authorization Demonstration

The prototype also demonstrates role-based authorization.

For example:

VEIL-001
Role = customer

attempting:

/admin/accounts

should result in:

403 Forbidden

because the client is authenticated but does not have the required administrative permission.

🔢 HTTP Status Codes

The prototype demonstrates standard HTTP security status codes.

200 OK

The request was successfully processed.

Valid client
+
Allowed endpoint
=
200
401 Unauthorized

Authentication failed.

Invalid token
+
Protected endpoint
=
401
403 Forbidden

The client is authenticated but does not have permission.

Customer
+
Admin endpoint
=
403

Therefore:

200 → Allowed / successful request

401 → Authentication failure

403 → Authorization failure
🚪 Fail-Closed Design

A security-sensitive system should avoid assuming that an unavailable security check is safe.

VeilAgent follows a fail-closed approach in important parts of its privacy workflow.

Conceptually:

Can privacy condition be verified?
       │
   ┌───┴───┐
  YES      NO
   │        │
   ▼        ▼
CONTINUE   STOP

This is preferable to:

Privacy check failed
       ↓
Assume everything is safe
       ↓
Continue anyway

The prototype applies this principle particularly to visual privacy conditions and other safety-critical checks.

📋 Audit Logging

VeilAgent includes an audit mechanism for recording security-related events.

Relevant backend components include:

backend/api/audit.py
backend/database.py

The prototype uses SQLite for persistence.

Audit information can include:

Client
Endpoint
Status
Timestamp
Reason / event information

Example events:

UNKNOWN   /agent/reason      BLOCKED
VEIL-001  /admin/accounts    FORBIDDEN
VEIL-001  /agent/reason      ALLOWED
🏦 SecureBank

SecureBank is the simulated banking website included in the project.

It provides a realistic environment for demonstrating:

Login
Dashboard
Account details
Transactions
Beneficiaries
Transfer workflow
Sensitive information detection
Browser automation
Human confirmation
🧪 SecureBank Is Simulated

SecureBank does not connect to:

❌ Real banks
❌ Real bank accounts
❌ Real payment gateways
❌ Real banking APIs
❌ Real financial infrastructure

All information is fictional:

✓ Names
✓ Account numbers
✓ IFSC codes
✓ Card numbers
✓ Balances
✓ Transactions
✓ Beneficiaries

No real money moves.

🔄 Complete Example Workflow

Consider the following user request:

Transfer 5000 to my beneficiary

The full workflow is approximately:

USER
 │
 │ Transfer 5000 to my beneficiary
 ▼
┌──────────────┐
│     SEE      │
└──────┬───────┘
       │
       │ Read webpage
       ▼
┌──────────────┐
│    DETECT    │
└──────┬───────┘
       │
       │ Identify sensitive information
       ▼
┌──────────────┐
│    REDACT    │
└──────┬───────┘
       │
       │ Remove sensitive values from context
       ▼
┌──────────────┐
│ ACCESS CHECK │
└──────┬───────┘
       │
       │ Authentication + Authorization
       ▼
┌──────────────┐
│     SEND     │
└──────┬───────┘
       │
       │ Send minimized context
       ▼
┌──────────────┐
│    REASON    │
└──────┬───────┘
       │
       │ Determine next action
       ▼
┌──────────────┐
│   VALIDATE   │
└──────┬───────┘
       │
       │ Check action safety
       ▼
┌──────────────┐
│     ACT      │
└──────┬───────┘
       │
       │ Fill ₹5000
       ▼
     SEE AGAIN
       │
       ▼
    REASON AGAIN
       │
       │
       ▼
 Click "Review Transfer"
       │
       ▼
┌──────────────────────────┐
│ HUMAN CONFIRMATION        │
│ REQUIRED                  │
└──────────────────────────┘
       │
       ▼
      USER

The agent therefore automates preparation but leaves the final high-impact decision to the user.

🔒 Privacy Demonstration

Suppose the SecureBank page contains:

Account Number: 998877665544
IFSC: DEMO0009988
Card Number: XXXX XXXX XXXX 1234
Email: demo@example.com
Phone: 9876543210
PAN: ABCDE1234F

The privacy scanner can detect these values.

The interface can show:

Sensitive values found: 6
Values transmitted: 0

The system can classify detections such as:

ACCOUNT_NUMBER
IFSC
CARD_NUMBER
EMAIL
PHONE
PAN

The raw values are intended to be removed from the reasoning context before transmission.

🚫 Sensitive Query Example

Consider the task:

What is my account number?

If the account number has been redacted locally, the reasoning system receives the sanitized representation rather than the original account number.

Therefore, the system can respond that the information was redacted rather than retrieving the raw value from its backend context.

This demonstrates an important distinction:

Information exists on the webpage

does not necessarily mean:

Information is available to the reasoning system
🧪 Security Demonstration

The Security tab can demonstrate three important cases.

Case 1 — Invalid Authentication
Invalid token
      ↓
/agent/reason
      ↓
401
      ↓
BLOCKED

This demonstrates authentication enforcement.

Case 2 — Unauthorized Administrative Access
Client: VEIL-001
Role: customer
      ↓
/admin/accounts
      ↓
403
      ↓
FORBIDDEN

This demonstrates authorization enforcement.

Case 3 — Valid Authorized Request
Client: VEIL-001
Role: customer
      ↓
/agent/reason
      ↓
200
      ↓
ALLOWED

This demonstrates successful authentication and authorization.

🧪 Testing

Testing can be divided into several categories.

Functional Testing

Test:

Login
Page navigation
DOM extraction
PII detection
Redaction
Form filling
Agent reasoning
Action validation
Transfer workflow
Human confirmation
Audit logging
Privacy Testing

Test:

Account number detection
IFSC detection
Card number detection
Email detection
Phone detection
PAN detection
Confidence thresholds
Redaction
Sanitized payload
Sensitive information queries
Security Testing

Test:

Missing token
Invalid token
Valid token
Customer access
Admin access
Customer → Admin endpoint
Allowed endpoint
Forbidden endpoint
Safety Testing

Test:

Invalid actions
Restricted actions
Irreversible actions
Page changes
Backend errors
Screenshot failures
Unsupported actions
🧪 Unauthorized Access Test

The repository contains:

tools/unauthorized_test.py

It can be used to exercise authentication and authorization behavior.

Run locally with:

python tools/unauthorized_test.py

The resulting events can also be inspected through the audit functionality.

🧰 Technology Stack
Category	Technology
Browser	Google Chrome
Extension Architecture	Chrome Manifest V3
Frontend	HTML, CSS, JavaScript
Browser APIs	Chrome Extension APIs
Backend Language	Python
Backend Framework	FastAPI
Server	Uvicorn
Detection	JavaScript Regex + DOM Metadata + Heuristics
Redaction	JavaScript
Visual Privacy	JavaScript / Canvas-based processing
Reasoning	Deterministic Rule-Based Engine
Authentication	Bearer Tokens
Authorization	Role-Based Access Control
Database	SQLite
Client Storage	IndexedDB
Version Control	Git
Repository	GitHub
Deployment	Render
