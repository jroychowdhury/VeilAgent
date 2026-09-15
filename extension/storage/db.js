/* IndexedDB - local redaction history. Counts and types only, never the values. */

window.VeilDB = (() => {
  const NAME = "veilagent";
  const STORE = "redaction_logs";

  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function log(entry) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add({
        timestamp: new Date().toISOString(),
        url: entry.url,
        redactions: entry.redactions,
        types: entry.types,
        lowestConfidence: entry.lowestConfidence,
        transmitted: entry.transmitted
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function all() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result.reverse());
      request.onerror = () => reject(request.error);
    });
  }

  return { log, all };
})();
