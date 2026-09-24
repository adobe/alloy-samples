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

const JSON_CONTENT_ITEM_SCHEMA =
  "https://ns.adobe.com/personalization/json-content-item";

const button = document.getElementById("personalize-button");
const status = document.getElementById("personalization-status");
const target = document.getElementById("personalization-target");

const setStatus = (message, alertClass) => {
  status.innerHTML = `<div class="alert ${alertClass}" role="alert">${message}</div>`;
};

// Target/AJO JSON-content offers (e.g. the real "sample-json-offer" Target
// activity this sample points at by default) aren't auto-rendered by
// applyPropositions — it only auto-renders dom-action, message/in-app, and
// default-content-item propositions (plus html-content-item, given extra
// metadata this sample doesn't pass). So render JSON content by hand,
// exactly the way target/personalization-hybrid's applyPersonalization
// function does with applyResponse's result.
const renderJsonContentOffer = (proposition) => {
  const {
    heroImageName = "demo-marketing-offer1-default.png",
    buttonActions = [],
  } = proposition.items[0].data.content || {};

  target.innerHTML = `
    <img src="img/${heroImageName}" class="img-fluid rounded mb-3" alt="Personalized offer" />
    <div id="offer-buttons"></div>
  `;

  document.getElementById("offer-buttons").append(
    ...buttonActions.map(({ text, content }) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "btn btn-outline-primary me-2";
      el.textContent = text;
      el.addEventListener("click", () => window.alert(content));
      return el;
    }),
  );
};

button.addEventListener("click", async () => {
  button.disabled = true;
  button.textContent = "Fetching from the server…";
  status.innerHTML = "";

  try {
    // This request is what triggers @adobe/alloy-node's forRequest() +
    // sendEvent() server-side — see the /personalize route in src/server.js.
    const response = await fetch("/personalize");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Request failed (${response.status})`);
    }

    const jsonOffer = result.propositions.find(
      (p) => p.items[0]?.schema === JSON_CONTENT_ITEM_SCHEMA,
    );

    if (jsonOffer) {
      renderJsonContentOffer(jsonOffer);
    } else {
      // Anything else (our mock content is a dom-action proposition)
      // applyPropositions renders on its own — no custom code needed.
      await alloy("applyPropositions", { propositions: result.propositions });
    }

    setStatus(
      result.usedMock
        ? "No live activity is configured for this decision scope, so the server fell back to a mock proposition (see <code>src/server.js</code>). The request/response round trip to the Edge Network was still real."
        : "This is content returned by a live personalization activity.",
      result.usedMock ? "alert-warning" : "alert-success",
    );
    button.textContent = "Get personalized content again";
  } catch (error) {
    setStatus(`Error: ${error.message}`, "alert-danger");
    button.textContent = "Get personalized content";
  } finally {
    button.disabled = false;
  }
});
