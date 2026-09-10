/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const consentStatus = document.getElementById("consent-status");
const eventLog = document.getElementById("event-log");

const logLine = (message, alertClass) => {
  const line = document.createElement("div");
  line.className = `alert ${alertClass} py-2`;
  line.textContent = message;
  eventLog.prepend(line);
};

const setConsentStatus = (value) => {
  const accepted = value === "in";
  consentStatus.textContent = `This visitor's consent: ${value}`;
  consentStatus.className = `alert ${accepted ? "alert-success" : "alert-warning"}`;
};

const sendConsent = async (value) => {
  try {
    // This is what triggers @adobe/alloy-node's forRequest() + setConsent()
    // server-side — see the /consent route in src/server.js.
    const response = await fetch("/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Request failed (${response.status})`);
    }
    setConsentStatus(result.value);
    logLine(`Consent set to "${result.value}"`, "alert-info");
  } catch (error) {
    logLine(`Error setting consent: ${error.message}`, "alert-danger");
  }
};

document
  .getElementById("accept-consent")
  .addEventListener("click", () => sendConsent("in"));
document
  .getElementById("decline-consent")
  .addEventListener("click", () => sendConsent("out"));

document
  .getElementById("record-pageview")
  .addEventListener("click", async () => {
    try {
      // This is what triggers @adobe/alloy-node's forRequest() +
      // sendEvent() + getIdentity() server-side — see the /track route in
      // src/server.js.
      const response = await fetch("/track", { method: "POST" });
      const result = await response.json();

      if (result.blocked) {
        logLine(`Blocked: ${result.message}`, "alert-danger");
      } else {
        logLine(`Recorded pageview for ECID ${result.ecid}`, "alert-success");
      }
    } catch (error) {
      logLine(`Error recording pageview: ${error.message}`, "alert-danger");
    }
  });
