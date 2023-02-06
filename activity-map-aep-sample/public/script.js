/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const ALLOY_LAST_INTERACTION = "AlloyLastInteraction";

function onBeforeLinkClickSend(options) {
  console.log("options onBeforeLinkClickSend", options);
  const { xdm } = options;
  // here we filter the link clicks that we want to be tracked
  return xdm.web.webInteraction.name !== "About";

}

function onBeforeEventSend(options) {
  const xdm = options.xdm;
  console.log("options onBeforeEventSend", options);
  if(xdm.web && xdm.web.webInteraction) {
      // we trigger the event so that it gets collected
      if(xdm.web.webInteraction.type === "exit") {
        return true;
      }
      // all the rest of the interactions are stored in local storage or cookie and sent with next page view event
      const interaction = xdm.web.webInteraction;
      const activityMap = {};
      activityMap.page = document.location.href;
      activityMap.linkRegion = interaction.region;
      activityMap.linkName = interaction.name;
      addDataToLocalStorage(activityMap);
      return false;
    }

  if (xdm.eventType === "page-view") { // this type of events have represents page view hit
      const lastInteraction = getDataFromStorage();
      if (lastInteraction) {
        if(!xdm.web.webReferrer.URL) {
          xdm.web.webReferrer.URL = lastInteraction.page;
        }
        xdm.web.webReferrer.linkRegion = lastInteraction.linkRegion;
        xdm.web.webReferrer.linkName = lastInteraction.linkName;

        clearDataFromStorage();
      }
    }

  return true;
}

function addDataToLocalStorage(data) {
  window.localStorage.setItem(ALLOY_LAST_INTERACTION, JSON.stringify(data));
  console.log(
    "add: interaction saved",
    window.localStorage.getItem(ALLOY_LAST_INTERACTION)
  );
}

function getDataFromStorage() {
  const lastInteractionItem = window.localStorage.getItem(
    ALLOY_LAST_INTERACTION
  );
  console.log("get: lastInteractionItem", lastInteractionItem);
  return JSON.parse(lastInteractionItem);
}

function clearDataFromStorage() {
  window.localStorage.removeItem(ALLOY_LAST_INTERACTION);
}
