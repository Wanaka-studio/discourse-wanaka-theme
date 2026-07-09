import { apiInitializer } from "discourse/lib/api";
import { i18n } from "discourse-i18n";

// Enhance Wanaka game-share oneboxes into "Play" cards.
//
// A game link https://<game_share_host>/g/<id> pasted on its own line is
// server-side oneboxed by Discourse from the /g page's OpenGraph tags (cover +
// title + description). This initializer adds a "▶ Play" button to that card;
// clicking it mounts an in-post iframe pointing at the /g link. The /g page has
// a meta refresh that navigates the iframe on to play.html, so we never need to
// know the studio origin (env-agnostic).
//
// The iframe contract mirrors packages/game-embed/src/play-overlay.tsx:
//   - `allow` list copied verbatim (autoplay/fullscreen/gamepad/... with `*`)
//   - NEVER auto-mount: the iframe is created only on click (one page may hold
//     many game cards)
//   - 12s load timeout → scrim with an "open in new tab" fallback
//   - Esc closes the most recently opened frame only; ✕ closes its own
//
// The client-injected iframe is NOT part of the post's cooked HTML, so it is not
// subject to the `allowed_iframes` site setting, and Discourse's default CSP has
// no frame-src restriction — no site-setting changes are required.

// Wanaka 3D games ship Three.js + assets through a two-hop iframe (/g meta-
// refreshes to play.html), so `load` can legitimately fire late — keep the
// guard generous and make it self-heal (see the load listener below).
const LOAD_TIMEOUT_MS = 20000;

// Stack of teardown callbacks for open frames; Esc pops the top only.
const openFrames = [];
let escBound = false;

function bindEscOnce() {
  if (escBound) {
    return;
  }
  escBound = true;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openFrames.length > 0) {
      openFrames[openFrames.length - 1]();
    }
  });
}

export default apiInitializer("1.8.0", (api) => {
  function mountPlayIframe(card, gUrl) {
    // Idempotent, and the only place an iframe is created (never auto-mount).
    if (card.querySelector(".wanaka-play-frame")) {
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "wanaka-play-wrap";

    const iframe = document.createElement("iframe");
    iframe.className = "wanaka-play-frame";
    // Point at the /g link; its meta refresh redirects the iframe to play.html.
    iframe.src = gUrl;
    iframe.setAttribute(
      "allow",
      "autoplay *; fullscreen *; gamepad *; accelerometer *; gyroscope *; pointer-lock *"
    );
    iframe.setAttribute("loading", "lazy");

    const close = document.createElement("button");
    close.className = "btn wanaka-play-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", i18n(themePrefix("game_onebox.close")));

    const teardown = () => {
      const i = openFrames.indexOf(teardown);
      if (i !== -1) {
        openFrames.splice(i, 1);
      }
      clearTimeout(loadGuard);
      wrap.remove();
    };
    close.addEventListener("click", teardown);
    openFrames.push(teardown);
    bindEscOnce();

    // Load guard: a cross-origin frame denied by frame-ancestors (or a dead
    // link) renders as a silent black box — after 12s offer an escape hatch.
    const loadGuard = setTimeout(() => {
      if (wrap.querySelector(".wanaka-play-fallback")) {
        return;
      }
      const fallback = document.createElement("div");
      fallback.className = "wanaka-play-fallback";
      const msg = document.createElement("span");
      msg.textContent = i18n(themePrefix("game_onebox.load_timeout"));
      const open = document.createElement("a");
      open.className = "btn btn-primary";
      open.href = gUrl;
      open.target = "_blank";
      open.rel = "noopener";
      open.textContent = i18n(themePrefix("game_onebox.open_new_tab"));
      fallback.appendChild(msg);
      fallback.appendChild(open);
      wrap.appendChild(fallback);
    }, LOAD_TIMEOUT_MS);
    iframe.addEventListener("load", () => {
      clearTimeout(loadGuard);
      // A slow game may outlive the guard and then finish — the frame has
      // proven alive, so remove the fallback instead of covering a live game.
      wrap.querySelector(".wanaka-play-fallback")?.remove();
    });

    wrap.appendChild(close);
    wrap.appendChild(iframe);
    card.appendChild(wrap);
  }

  api.decorateCookedElement(
    (element) => {
      element.querySelectorAll("aside.onebox a[href]").forEach((a) => {
        let url;
        try {
          url = new URL(a.href);
        } catch {
          return;
        }

        // Only enhance /g/<id> links on the configured game-share host.
        if (url.host !== settings.game_share_host) {
          return;
        }
        const match = url.pathname.match(/^\/g\/([^/]+)\/?$/);
        if (!match) {
          return;
        }

        const card = a.closest("aside.onebox");
        // Idempotent: decorate can fire multiple times per element.
        if (!card || card.querySelector(".wanaka-play-btn")) {
          return;
        }
        card.classList.add("wanaka-game-card");

        const btn = document.createElement("button");
        btn.className = "btn btn-primary wanaka-play-btn";
        btn.textContent = i18n(themePrefix("game_onebox.play"));
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          mountPlayIframe(card, url.href);
        });
        card.appendChild(btn);
      });
    },
    { id: "wanaka-game-onebox", onlyStream: true }
  );
});
