export class StateStore {
  #store = new Map();
  #fpidToEcid = new Map();

  /**
   * Updates the state store with new handles for a given ECID.
   * @param {string} ecid
   * @param {Array} handles
   */
  update(ecid, handles) {
    if (!ecid) return;
    const stateStoreHandle = handles.find((h) => h.type === "state:store");
    if (stateStoreHandle?.payload) {
      if (!this.#store.has(ecid)) {
        this.#store.set(ecid, new Map());
      }
      const sessionStore = this.#store.get(ecid);
      for (const item of stateStoreHandle.payload) {
        // item.maxAge is in seconds
        const expiresAt = Date.now() + item.maxAge * 1000;
        sessionStore.set(item.key, { value: item.value, expiresAt });
      }
    }
  }

  /**
   * Associates an FPID with an ECID
   * @param {string} fpid
   * @param {string} ecid
   */
  setEcidForFpid(fpid, ecid) {
    if (fpid && ecid) {
      this.#fpidToEcid.set(fpid, ecid);
    }
  }

  /**
   * Gets the ECID associated with an FPID
   * @param {string} fpid
   * @returns {string | undefined}
   */
  getEcidForFpid(fpid) {
    return this.#fpidToEcid.get(fpid);
  }

  /**
   * Manually sets a value in the store.
   * @param {string} ecid
   * @param {string} key
   * @param {string} value
   * @param {number} [ttl=1800] Time to live in seconds (default 30 mins)
   */
  set(ecid, key, value, ttl = 1800) {
    if (!ecid) return;
    if (!this.#store.has(ecid)) {
      this.#store.set(ecid, new Map());
    }
    const sessionStore = this.#store.get(ecid);
    const expiresAt = Date.now() + ttl * 1000;
    sessionStore.set(key, { value, expiresAt });
  }

  /**
   * Retrieves the stored state for a given ECID.
   * Removes expired items.
   * @param {string} ecid
   * @returns {Map<string, string>} Map of key-value pairs for the session
   */
  get(ecid) {
    if (!ecid || !this.#store.has(ecid)) return new Map();
    const sessionStore = this.#store.get(ecid);
    const result = new Map();
    const now = Date.now();

    for (const [key, data] of sessionStore.entries()) {
      if (data.expiresAt > now) {
        result.set(key, data.value);
      } else {
        sessionStore.delete(key);
      }
    }
    return result;
  }

  /**
   * Formats the stored state as meta entries for the Edge Network request.
   * @param {string} ecid
   * @returns {Array<{key: string, value: string}>}
   */
  toMetaEntries(ecid) {
    const sessionState = this.get(ecid);
    const entries = [];
    for (const [key, value] of sessionState.entries()) {
      entries.push({ key, value });
    }
    return entries;
  }
}
