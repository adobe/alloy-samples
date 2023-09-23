
function buildXdm() {
  const xdm = {};
  const viewName = (document.location.hash || "#").slice(1);
  if (viewName) {
    xdm.web = {
      webPageDetails: {
        viewName
      },
    };
  }
  return xdm;
}

function styleActiveView() {
  const viewName = document.location.hash || "#spa1";
  $(".navbar-nav li").removeClass("active");
  $(`a[href="${viewName}"]`).parent().addClass("active");

  $(".view").addClass("hidden");
  $(viewName).removeClass("hidden");
}
$(document).ready(styleActiveView);

window.addEventListener('hashchange',() => {
  styleActiveView();

  if (!document.location.hash) {
    return;
  }
  // There are two ways to handle a view change event.
  // 1. Just call sendEvent with the new view name. This will render the
  //   propositions for the new view, and include the display notifications
  //   in the event.
  // 2. Call applyPropositions with the new view name. This will render the
  //   propositions for the new view, and save the display notifications for
  //   later. Then call sendEvent with includePendingDisplayNotifications set.
  const viewName = document.location.hash.slice(1);
  if (viewName === "spa2") {
    alloy("sendEvent", {
      renderDecisions: true,
      xdm: buildXdm()
    });
  } else {
    alloy("applyPropositions", { viewName });

    alloy("sendEvent", {
      personalization: {
        includePendingDisplayNotifications: true
      },
      xdm: buildXdm()
    });
  }
});
