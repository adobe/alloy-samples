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

const createContentCardManager = (containerElementId) => {
  let contentCards = [];
  let collectEvent = () => undefined;

  const createContentCard = (proposition, item) => {
    const { data = {}, id } = item;
    const {
      content = {},
      meta = {},
      publishedDate,
      qualifiedDate,
      displayedDate,
    } = data;

    return {
      id,
      ...content,
      meta,
      qualifiedDate,
      displayedDate,
      publishedDate,
      getProposition: () => proposition,
    };
  };

  const extractContentCards = (propositions) =>
    propositions
      .reduce((allItems, proposition) => {
        const { items = [] } = proposition;

        return [
          ...allItems,
          ...items.map((item) => createContentCard(proposition, item)),
        ];
      }, [])
      .sort(
        (a, b) =>
          b.qualifiedDate - a.qualifiedDate || b.publishedDate - a.publishedDate
      );

  const handleContentCardClick = (evt) => {
    const cardEl = evt.target.closest(".card");

    if (!cardEl) {
      return;
    }

    const isAnchor = evt.target.nodeName === "A";
    const card = contentCards.find((card) => card.id === cardEl.dataset.id);

    if (!card) {
      return;
    }

    collectEvent("interact", [card.getProposition()]);

    if (isAnchor) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      const { actionUrl } = card;
      if (actionUrl && actionUrl.length > 0) {
        window.location.href = actionUrl;
      }
    }
  };

  const renderContentCards = () => {
    const contentCardsContainer = document.getElementById(containerElementId);
    contentCardsContainer.addEventListener("click", handleContentCardClick);

    let contents = "";

    contentCards.forEach((card) => {
      const { id, title, body, imageUrl, meta = {} } = card;
      const { buttonLabel = "" } = meta;

      contents += `
        <div class="col">
          <div data-id="${id}" class="card h-100">
            <img src="${imageUrl}" class="card-img-top" alt="...">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${title}</h5>
              <p class="card-text">${body}</p>
              <a href="#" class="mt-auto btn btn-primary">${buttonLabel}</a>
            </div>
          </div>
        </div>
      `;
    });

    contentCardsContainer.innerHTML = contents;
    collectEvent(
      "display",
      contentCards.map((card) => card.getProposition())
    );
  };

  const providePropositions = (propositions) => {
    if (!Array.isArray(propositions) || propositions.length === 0) {
      return;
    }
    contentCards = extractContentCards(propositions);
    renderContentCards();
  };

  const provideCollectEvent = (fn) => {
    if (typeof fn !== "function") {
      return;
    }
    collectEvent = fn;
  };

  return {
    refresh: (propositions, collectEvent) => {
      provideCollectEvent(collectEvent);
      providePropositions(propositions);
    },
  };
};

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
