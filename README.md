# VeilAgent

A privacy-first autonomous browser agent. It reads a banking page **on your device**, finds and blacks out sensitive values before anything is transmitted, checks that the calling client is authorised, asks a server-side reasoning layer what to do next, and performs the action in the browser. Every allowed and refused request lands in an audit log.

The bank in this repo, **SecureBank**, is a simulation. Fake names, fake account numbers, fake money. No real banking API is touched and no money moves.

---

## Run it

You need Python 3.9+ and Chrome. Node is not required.

### 1. Start the backend and the bank site

```bash
# macOS / Linux
./run.sh
```

```bat
REM Windows
run.bat
```

That creates a virtualenv, installs dependencies, and serves everything on one port:

| URL | What it is |
| --- | --- |
| http://localhost:8000/ | SecureBank login page |
| http://localhost:8000/docs | API reference |
| http://localhost:8000/audit/logs | Raw audit log (needs a token) |

In VS Code you can instead press `Ctrl/Cmd+Shift+B` and pick **Start VeilAgent**, or use the Run panel's *Run VeilAgent backend* configuration.

### 2. Load the extension

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this project

### 3. Use it

1. Go to http://localhost:8000/ and sign in with **demo / demo123**
2. Click the VeilAgent icon in the toolbar to open the side panel
3. Type a task and press **Run agent**

Tasks that work out of the box:

- `Open the transfer page`
- `Show my transactions`
- `Transfer 5000 to my beneficiary`
- `What is my account number?` — the agent has to refuse, because that value was redacted before it ever reached the reasoning layer

---

## The loop

```
SEE  →  DETECT  →  REDACT  →  ACCESS CHECK  →  SEND  →  REASON  →  VALIDATE  →  ACT  →  repeat
└──────────── all on device ────────────┘        └──── server ────┘   └── on device ──┘
```

| Stage | Where it lives | What it does |
| --- | --- | --- |
| See | `content/capture` via `background.js`, `content/domExtractor.js` | screenshot plus the page's interactive elements |
| Detect | `detection/piiDetector.js` | regex patterns and DOM attribute heuristics find account numbers, IFSC, cards, PAN, email, phone, passwords |
| Detect (pixels) | `detection/visionDetector.js` | maps detections to screen regions and blacks them out on a canvas |
| Redact | `redaction/redactor.js` | masks values in text and labels; **fail-closed** if confidence drops below 0.80 |
| Access check | `security/auth.js`, `security/accessMonitor.js`, `backend/security.py` | bearer token, then role permission |
| Reason | `backend/reasoning.py` | sanitized context in, action JSON out |
| Validate | `agent/actionParser.js` | allowlist, element existence, and a block on irreversible money actions |
| Act | `content/executor.js` | clicks, types, scrolls |
| Audit | `backend/api/audit.py`, SQLite | every allow and refusal, with a reason |

### What actually leaves the device

Open the **Privacy** tab in the panel after a run. The payload is printed there in full. It contains element labels, an already-masked text preview, a redaction count and a confidence score. It does not contain account numbers, IFSC codes, card numbers, PAN, email addresses, phone numbers or the screenshot. The blacked-out screenshot is rendered in the panel and stays in the browser.

### Fail-closed

If any detected value cannot be mapped to a reliable region, or detection confidence for the page falls under 0.80, the context is not transmitted at all and the run stops. That rule is in `redaction/redactor.js` (`policy`) and `detection/visionDetector.js`.

---

## The security demo

Authentication ("who is calling") and authorization ("may they do this") are separate checks, and both are logged.

From the panel's **Security** tab:

- **Use invalid token** then **Call /agent/reason** → `401 BLOCKED`, logged as `UNKNOWN`
- **Use valid token** then **Call /admin/accounts** → `403 FORBIDDEN`, because the demo client has the `customer` role
- **Refresh audit log** shows every event with client, endpoint, status and reason

From a terminal, with the server running:

```bash
python tools/unauthorized_test.py
```

It walks five cases and prints the verdict for each, all of which then appear in the panel.

Demo clients live in `backend/database.py`:

| Client | Role | Token |
| --- | --- | --- |
| VEIL-001 | customer | `veil-demo-token-001` |
| VEIL-ADM | admin | `veil-admin-token-002` |

---

## Layout

```
VeilAgent/
├── run.sh / run.bat            one-command start
├── banking-demo/               simulated SecureBank (plain HTML/CSS/JS)
│   ├── index.html              login
│   ├── dashboard.html          account summary
│   ├── account.html            full details + beneficiaries
│   ├── transactions.html       statement
│   ├── transfer.html           fund transfer (simulated)
│   └── assets/                 bank.css, bank.js, data.js (all dummy data)
├── extension/                  VeilAgent Chrome extension, Manifest V3
│   ├── manifest.json
│   ├── background.js           side panel + screenshot capture
│   ├── content/                domExtractor.js, executor.js, content.js
│   ├── detection/              piiDetector.js, visionDetector.js
│   ├── redaction/              redactor.js
│   ├── security/               auth.js, accessMonitor.js
│   ├── agent/                  agentLoop.js, actionParser.js
│   ├── storage/                db.js (IndexedDB redaction history)
│   └── sidepanel/              panel.html, panel.css, panel.js
├── backend/                    FastAPI
│   ├── main.py                 serves the API and the bank site
│   ├── security.py             authentication + authorization gate
│   ├── reasoning.py            action planner
│   ├── database.py             SQLite: users, access_logs, agent_logs
│   └── api/                    auth.py, agent.py, audit.py, admin.py
├── database/veilagent.db       created on first run
└── tools/unauthorized_test.py  scripted security demo
```

---

## Suggested demo order

1. Sign in to SecureBank — point out the real-looking account number, IFSC, card, email, phone
2. Open the panel, hit **Scan page without acting** — the Privacy tab fills with before/after pairs and a blacked-out screenshot
3. Show the payload JSON: this is everything the server sees
4. Run `Open the transfer page` — the pipeline lights up and the browser clicks by itself
5. Run `What is my account number?` — the agent cannot answer, because the value never left the device
6. Security tab: switch to the invalid token, fire the probes, refresh the audit log
7. Finish on the audit table: allowed rows next to blocked rows, each with a reason

---

## Swapping in a real model

`backend/reasoning.py` ships a deterministic planner so the demo never depends on a download or an API key. The contract is fixed:

```json
{ "action": "click", "target_index": 3, "target": "Transfer Money",
  "value": null, "reason": "...", "done": false }
```

Implement `llm_decide(task, context)` with an open-weight VLM/LLM (Qwen-VL, LLaVA and similar), then start the server with `VEILAGENT_REASONER=llm`. The context it receives is already sanitized, so the model never sees raw values.

Similarly, `detection/visionDetector.js` currently derives regions from the DOM. Replacing that with an ONNX Runtime Web or Transformers.js detector means changing where `boxes` comes from; the fail-closed policy around it stays as is.

## Limits worth stating out loud

- The bank is a simulation, not a banking integration
- The reasoning layer is rule-based unless you wire up a model
- The detector uses regex and DOM heuristics, so it is tuned to this page's field names; a stronger NER model is the obvious next step
- Audit logging tracks *clients and tokens*, not real-world identities
- Tokens are seeded in plain text for the demo; a real deployment needs proper issuance, rotation and hashing
