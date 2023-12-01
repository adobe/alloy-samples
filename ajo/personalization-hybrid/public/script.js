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

function sendDisplayEvent(proposition) {
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
            },
          ],
          propositionEventType: {
            display: 1
          },
        },
      },
    },
  });
}

function sendInteractEvent(label, proposition) {
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
            },
          ],
          propositionEventType: {
            interact: 1
          },
          propositionAction: {
            label: label
          },
        },
      },
    },
  });
}

function updateButtons(buttonActions, proposition) {
  buttonActions.forEach((buttonAction) => {
    const { id, text, content } = buttonAction;

    const element = document.getElementById(`action-button-${id}`);
    element.innerText = text;

    element.addEventListener("click", () => sendInteractEvent(text, proposition));
  });
}

function applyPersonalization(surfaceName) {
  return function (result) {
    const { propositions = []} = result;

    const proposition = propositions.filter((p) =>
      p.scope.endsWith(surfaceName)
    )[0];

    if (proposition) {
      // send display event for the surface
      sendDisplayEvent(proposition)

      const element = document.querySelector("img.ajo-decision");

      const {
        buttonActions = [],
        heroImageName = "demo-marketing-decision1-default.png",
      } = proposition.items[0].data.content;

      updateButtons(buttonActions, proposition);

      element.src = `img/${heroImageName}`;
    }
  };
}
