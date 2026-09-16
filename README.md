# VeilAgent

A privacy-first autonomous browser agent. It reads a banking page **on your device**, detects and redacts sensitive values before anything is transmitted, verifies that the calling client is authorised, asks a server-side reasoning layer what to do next, and performs permitted actions in the browser. Every allowed, blocked, and refused request is recorded in an audit log.

The bank in this repo, **SecureBank**, is a simulation. All names, account numbers, balances, and transactions are fictional. No real banking API is connected and no real money moves.

---

## Live Prototype

https://veilagent-1.onrender.com/

**Demo Login**

```text
Username: demo
Password: demo123
