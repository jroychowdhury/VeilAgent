/* Every backend call goes through here so allow/block outcomes are visible in the panel. */

window.VeilAccess = (() => {
  const listeners = [];
  const events = [];

  function onEvent(fn) { listeners.push(fn); }

  function record(event) {
    events.unshift(event);
    events.splice(40);
    listeners.forEach(fn => fn(event, events));
  }

  async function request(path, options = {}) {
    const credentials = await window.VeilAuth.get();
    const headers = await window.VeilAuth.headers();
    const started = Date.now();

    let response, body;
    try {
      response = await fetch(window.VeilAuth.BASE_URL + path, { ...options, headers });
      body = await response.json().catch(() => ({}));
    } catch (error) {
      record({
        time: new Date().toLocaleTimeString(),
        clientId: credentials.clientId,
        endpoint: path,
        status: "OFFLINE",
        reason: "Backend unreachable - is the server running on port 8000?"
      });
      return { ok: false, status: 0, body: { detail: String(error) } };
    }

    record({
      time: new Date().toLocaleTimeString(),
      clientId: credentials.clientId,
      endpoint: path,
      status: response.ok ? "ALLOWED" : (response.status === 403 ? "FORBIDDEN" : "BLOCKED"),
      reason: response.ok ? "Token and role verified" : (body.detail || response.statusText),
      ms: Date.now() - started
    });

    return { ok: response.ok, status: response.status, body };
  }

  const post = (path, payload) => request(path, { method: "POST", body: JSON.stringify(payload) });
  const get = (path) => request(path, { method: "GET" });

  return { request, post, get, onEvent, events };
})();
