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

const pageEcid = document.getElementById("ecid")?.textContent;
const eventLog = document.getElementById("event-log");

const logLine = (message, alertClass) => {
  const line = document.createElement("div");
  line.className = `alert ${alertClass} py-2`;
  line.textContent = message;
  eventLog.prepend(line);
};

document.querySelectorAll("#action-buttons button").forEach((button) => {
  button.addEventListener("click", async () => {
    const eventType = button.getAttribute("data-event-type");

    try {
      // This request is what triggers @adobe/alloy-node's forRequest() +
      // sendEvent() server-side — see the /track route in src/server.js.
      const response = await fetch("/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Request failed (${response.status})`);
      }

      const sameVisitor = result.ecid === pageEcid;
      logLine(
        `Collected "${eventType}" for ECID ${result.ecid} — ${
          sameVisitor ? "matches this page's visitor" : "different visitor?!"
        }`,
        sameVisitor ? "alert-success" : "alert-danger",
      );
    } catch (error) {
      logLine(`Error collecting "${eventType}": ${error.message}`, "alert-danger");
    }
  });
});
