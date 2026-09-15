/* Client credentials for the extension. */

window.VeilAuth = (() => {
  const DEFAULT = { clientId: "VEIL-001", token: "veil-demo-token-001" };
  const IMPOSTOR = { clientId: "UNKNOWN", token: "INVALID_TOKEN" };
  const BASE_URL = "http://localhost:8000";

  async function get() {
    const stored = await chrome.storage.local.get(["veilCredentials"]);
    return stored.veilCredentials || DEFAULT;
  }

  async function set(credentials) {
    await chrome.storage.local.set({ veilCredentials: credentials });
    return credentials;
  }

  async function useValid() { return set(DEFAULT); }
  async function useImpostor() { return set(IMPOSTOR); }

  async function headers() {
    const { token } = await get();
    return { "Content-Type": "application/json", Authorization: "Bearer " + token };
  }

  return { get, set, useValid, useImpostor, headers, BASE_URL, DEFAULT, IMPOSTOR };
})();
