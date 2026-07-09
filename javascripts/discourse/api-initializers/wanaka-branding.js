import { apiInitializer } from "discourse/lib/api";

// Fill Wanaka brand-bar (common/header.html) and footer (common/footer.html)
// link hrefs from theme settings, so no host is hard-coded in the HTML files.
// Each themed link carries a data-wanaka-href="<setting_key>" attribute; this
// resolves it against the `settings` global (injected from settings.yml).
//
// Re-applied on every route change because the theme HTML can re-render; setting
// an href repeatedly is harmless (idempotent).
//
// NOTE (confirm on the installed Discourse version): the apiInitializer version
// string ("1.8.0") and api.onPageChange match the plan; verify on the instance.
export default apiInitializer("1.8.0", (api) => {
  const applyLinks = () => {
    document.querySelectorAll("[data-wanaka-href]").forEach((el) => {
      const value = settings[el.dataset.wanakaHref];
      if (value) {
        el.setAttribute("href", value);
      }
    });
  };

  api.onPageChange(applyLinks);
});
