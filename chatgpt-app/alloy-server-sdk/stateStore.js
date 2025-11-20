export class StateStore {
  #store = new Map();

  /**
   * Updates the state store with new handles for a given session ID.
   * @param {string} sessionId
   * @param {Array} handles
   */
  update(sessionId, handles) {
    if (!sessionId) return;
    const stateStoreHandle = handles.find((h) => h.type === "state:store");
    if (stateStoreHandle?.payload) {
      if (!this.#store.has(sessionId)) {
        this.#store.set(sessionId, new Map());
      }
      const sessionStore = this.#store.get(sessionId);
      for (const item of stateStoreHandle.payload) {
        // item.maxAge is in seconds
        const expiresAt = Date.now() + item.maxAge * 1000;
        sessionStore.set(item.key, { value: item.value, expiresAt });
      }
    }
  }

  /**
   * Manually sets a value in the store.
   * @param {string} sessionId
   * @param {string} key
   * @param {string} value
   * @param {number} [ttl=1800] Time to live in seconds (default 30 mins)
   */
  set(sessionId, key, value, ttl = 1800) {
    if (!sessionId) return;
    if (!this.#store.has(sessionId)) {
      this.#store.set(sessionId, new Map());
    }
    const sessionStore = this.#store.get(sessionId);
    const expiresAt = Date.now() + ttl * 1000;
    sessionStore.set(key, { value, expiresAt });
  }

  /**
   * Retrieves the stored state for a given session ID.
   * Removes expired items.
   * @param {string} sessionId
   * @returns {Map<string, string>} Map of key-value pairs for the session
   */
  get(sessionId) {
    if (!sessionId || !this.#store.has(sessionId)) return new Map();
    const sessionStore = this.#store.get(sessionId);
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
   * @param {string} sessionId
   * @returns {Array<{key: string, value: string}>}
   */
  toMetaEntries(sessionId) {
    const sessionState = this.get(sessionId);
    const entries = [];
    for (const [key, value] of sessionState.entries()) {
      entries.push({ key, value });
    }
    return entries;
  }
}
