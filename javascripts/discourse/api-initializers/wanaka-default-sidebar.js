import { apiInitializer } from "discourse/lib/api";

const SIDEBAR_HIDDEN_KEY = "sidebar-hidden";
const DEFAULT_APPLIED_KEY = "wanaka-sidebar-default-collapsed-v1";

// Apply the collapsed state once per browser. From then on Discourse owns the
// preference, so opening the sidebar remains a normal, persistent user choice.
// Wait for the game-first homepage: direct visits to a category or topic keep
// standard Discourse navigation available until the homepage is first seen.
export default apiInitializer("1.8.0", (api) => {
  api.onPageChange(() => {
    if (window.location.pathname.replace(/\/+$/, "") !== "") {
      return;
    }

    const keyValueStore = api.container.lookup("service:key-value-store");
    if (!keyValueStore || keyValueStore.getItem(DEFAULT_APPLIED_KEY)) {
      return;
    }

    keyValueStore.setItem(SIDEBAR_HIDDEN_KEY, "true");
    keyValueStore.setItem(DEFAULT_APPLIED_KEY, "true");

    const applicationController = api.container.lookup(
      "controller:application",
    );
    if (applicationController) {
      applicationController.showSidebar = false;
    }
  });
});
