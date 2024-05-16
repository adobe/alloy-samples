/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
function createIdentityPayload(
  id,
  authenticatedState = "ambiguous",
  primary = true
) {
  if (id.length === 0) {
    return undefined;
  }

  return {
    id,
    authenticatedState,
    primary,
  };
}

function sendDisplayEvent(proposition, itemIds = [], tokens = []) {
  const { id, scope, scopeDetails = {} } = proposition;
  alloy("sendEvent", {
    xdm: {
      eventType: "decisioning.propositionDisplay",
      _experience: {
        decisioning: {
          propositions: [
            {
              id: id,
              scope: scope,
              scopeDetails: scopeDetails,
              items: Array.from(new Set(itemIds)).map((id) => ({ id })),
            },
          ],
          propositionEventType: {
            display: 1,
          },
          propositionAction: {
            tokens: Array.from(new Set(tokens)),
          },
        },
      },
    },
  });
}

function sendInteractEvent(
  proposition,
  label = undefined,
  token = undefined,
  itemIds = []
) {
  const { id, scope, scopeDetails = {} } = proposition;

  alloy("sendEvent", {
    xdm: {
      eventType: "decisioning.propositionInteract",
      _experience: {
        decisioning: {
          propositions: [
            {
              id: id,
              scope: scope,
              scopeDetails: scopeDetails,
              items: Array.from(new Set(itemIds)).map((id) => ({ id })),
            },
          ],
          propositionEventType: {
            interact: 1,
          },
          propositionAction: {
            label: label,
            tokens: [token],
          },
        },
      },
    },
  });
}

function updateButtons(surfaceName, proposition) {
  if (!proposition) {
    return;
  }

  const { buttonActions = [] } = proposition.items[0].data.content;

  buttonActions.forEach((buttonAction) => {
    const { id, text, content } = buttonAction;

    const element = document.getElementById(`action-button-${id}`);
    element.dataset.aepClickLabel = `click-action-button-${id}`;
    element.innerText = text;
  });

  alloy("applyPropositions", {
    propositions: [proposition],
    metadata: {
      [surfaceName]: {
        selector: "#some-buttons",
        actionType: "collectInteractions",
      },
    },
  });
}

function updateImage(surfaceName, proposition) {
  if (!proposition) {
    return;
  }

  const { heroImageName = "demo-marketing-decision1-default.png" } =
    proposition.items[0].data.content;

  const element = document.querySelector("img.ajo-decision");

  element.src = `img/${heroImageName}`;

  alloy("applyPropositions", {
    propositions: [proposition],
    metadata: {
      [surfaceName]: {
        selector: "img.ajo-decision",
        actionType: "collectInteractions",
      },
    },
  });
}

function createApplyPersonalization(surfaceNames = []) {
  return function (result) {
    const { propositions = [] } = result;

    if (propositions.length === 0) {
      return;
    }

    surfaceNames.forEach((surfaceName) => {
      const proposition = propositions.find(
        (proposition) => proposition.scope === surfaceName
      );

      if (surfaceName === "web://localhost/#sample-json-content") {
        // send display event for the surface
        sendDisplayEvent(proposition);

        updateImage(surfaceName, proposition);
        updateButtons(surfaceName, proposition);
      }

      if (
        surfaceName === "web://alloy-samples.adobe.com/#movies-decision-policy"
      ) {
        alloy("applyPropositions", {
          propositions: [proposition],
          metadata: {
            [surfaceName]: {
              selector: "p#paragraph-text-2",
              actionType: "insertAfter",
            },
          },
        });
      }
    });
  };
}

function displayError(err) {
  console.error(err);
  const containerElement = document.getElementById("main-container");
  if (!containerElement) {
    return;
  }

  containerElement.innerHTML = `<div id="error-detail" class="page-header">
                                      <h3>&#128565; There was an error</h3>
                                      <div class="alert alert-danger" role="alert">${err.message}</div>
                                    </div>`;
}
