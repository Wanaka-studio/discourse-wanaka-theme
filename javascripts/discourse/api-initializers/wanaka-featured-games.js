import { apiInitializer } from "discourse/lib/api";
import { i18n } from "discourse-i18n";

// "Featured Games" strip — a Blender-Artists-style curated banner, Wanaka-
// flavored. Ops curate by putting the `featured` tag on Game Showcase topics
// (the tag lives in a staff-only tag group); this initializer renders those
// topics as a horizontal cover-card strip on top of the homepage and the
// Game Showcase category.
//
// Data source: /tag/featured.json (anonymous-readable). Cover = topic
// image_url (the first image of the first post — the showcase rules already
// require one). Topics without an image get a lime monogram placeholder.
//
// DOM strategy mirrors wanaka-branding.js: re-inject on every page change
// (Ember re-renders #main-outlet and drops foreign nodes), idempotent, and
// remove-first so navigating away never leaves a stale strip.

const STRIP_ID = "wanaka-featured-strip";
const MAX_CARDS = 8;
// Ember may not have painted #main-outlet children yet when onPageChange
// fires; retry briefly instead of racing the render loop.
const MOUNT_RETRIES = 8;
const MOUNT_RETRY_MS = 80;

function wantsStripHere() {
  const path = window.location.pathname;
  return (
    path === "/" ||
    path === "/categories" ||
    /^\/c\/game-showcase(\/|$)/.test(path)
  );
}

function buildCard(topic) {
  const a = document.createElement("a");
  a.className = "wanaka-featured-card";
  a.href = `/t/${topic.slug}/${topic.id}`;

  const cover = document.createElement("div");
  cover.className = "wanaka-featured-cover";
  if (topic.image_url) {
    const img = document.createElement("img");
    img.src = topic.image_url;
    img.alt = "";
    img.loading = "lazy";
    cover.appendChild(img);
  } else {
    const mono = document.createElement("span");
    mono.className = "wanaka-featured-mono";
    mono.textContent = (topic.title || "?").slice(0, 1).toUpperCase();
    cover.appendChild(mono);
  }

  const title = document.createElement("span");
  title.className = "wanaka-featured-title";
  title.textContent = topic.title;

  a.appendChild(cover);
  a.appendChild(title);
  return a;
}

async function renderStrip() {
  document.getElementById(STRIP_ID)?.remove();
  if (!wantsStripHere()) {
    return;
  }

  let topics = [];
  try {
    const resp = await fetch("/tag/featured.json", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      return; // tag missing or hidden — render nothing, never break the page
    }
    const data = await resp.json();
    topics = (data?.topic_list?.topics || []).slice(0, MAX_CARDS);
  } catch {
    return;
  }
  if (topics.length === 0) {
    return;
  }

  // The strip may race Ember's render; find the mount point with retries.
  for (let i = 0; i < MOUNT_RETRIES; i++) {
    const outlet = document.querySelector("#main-outlet");
    if (outlet) {
      // Re-check: a second onPageChange may have rendered it already.
      if (document.getElementById(STRIP_ID) || !wantsStripHere()) {
        return;
      }
      const strip = document.createElement("div");
      strip.id = STRIP_ID;

      const head = document.createElement("div");
      head.className = "wanaka-featured-head";
      const badge = document.createElement("span");
      badge.className = "wanaka-featured-badge";
      badge.textContent = i18n(themePrefix("featured_games.badge"));
      const label = document.createElement("span");
      label.className = "wanaka-featured-label";
      label.textContent = i18n(themePrefix("featured_games.title"));
      head.appendChild(badge);
      head.appendChild(label);

      const row = document.createElement("div");
      row.className = "wanaka-featured-row";
      topics.forEach((t) => row.appendChild(buildCard(t)));

      strip.appendChild(head);
      strip.appendChild(row);
      outlet.prepend(strip);
      return;
    }
    await new Promise((r) => setTimeout(r, MOUNT_RETRY_MS));
  }
}

export default apiInitializer("1.8.0", (api) => {
  api.onPageChange(() => {
    renderStrip();
  });
});
