import { apiInitializer } from "discourse/lib/api";
import { i18n } from "discourse-i18n";

// A game-first homepage for Wanaka Community.
//
// Staff curate the lead items with the configured featured tag. If fewer than
// nine topics are featured, the wall fills the remaining slots from the
// configured Game Showcase category. The existing Discourse discovery controls
// and topic list stay untouched immediately below this section.
//
// The wall is injected only on `/`. Discourse can rebuild #main-outlet after a
// route transition, so every render is generation-guarded and briefly retries
// the mount point. Navigating away invalidates any in-flight request.

const WALL_ID = "wanaka-game-wall";
const MAX_CARDS = 9;
const MOUNT_RETRIES = 8;
const MOUNT_RETRY_MS = 80;

let renderGeneration = 0;

function isHomepage() {
  return window.location.pathname.replace(/\/+$/, "") === "";
}

async function fetchTopics(url) {
  if (!url) {
    return [];
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data?.topic_list?.topics || [];
  } catch {
    // A hidden/missing tag or category must never block the forum homepage.
    return [];
  }
}

async function loadWallTopics() {
  const featuredTag = settings.featured_games_tag?.trim();
  const showcaseCategory = settings.game_showcase_category?.trim();
  const [featured, showcase] = await Promise.all([
    fetchTopics(
      featuredTag ? `/tag/${encodeURIComponent(featuredTag)}.json` : null,
    ),
    fetchTopics(
      showcaseCategory
        ? `/c/${encodeURIComponent(showcaseCategory)}.json`
        : null,
    ),
  ]);

  const topics = [];
  const seenIds = new Set();
  for (const topic of [...featured, ...showcase]) {
    if (!topic?.id || seenIds.has(topic.id)) {
      continue;
    }

    seenIds.add(topic.id);
    topics.push(topic);
    if (topics.length === MAX_CARDS) {
      break;
    }
  }

  return topics;
}

function topicPath(topic) {
  return `/t/${encodeURIComponent(topic.slug || "topic")}/${topic.id}`;
}

function buildCard(topic, index) {
  const card = document.createElement("a");
  card.className = "wanaka-game-wall-card";
  card.href = topicPath(topic);
  card.setAttribute("role", "listitem");
  card.setAttribute("aria-label", topic.title);
  if (index === 0) {
    card.classList.add("wanaka-game-wall-card--hero");
  }

  const media = document.createElement("span");
  media.className = "wanaka-game-wall-media";
  if (topic.image_url) {
    const image = document.createElement("img");
    image.src = topic.image_url;
    image.alt = "";
    image.decoding = "async";
    image.loading = index < 3 ? "eager" : "lazy";
    if (index === 0) {
      image.fetchPriority = "high";
    }
    media.appendChild(image);
  } else {
    media.classList.add("wanaka-game-wall-media--placeholder");
    const monogram = document.createElement("span");
    monogram.className = "wanaka-game-wall-monogram";
    monogram.textContent = (topic.title || "?").slice(0, 1).toUpperCase();
    media.appendChild(monogram);
  }

  const content = document.createElement("span");
  content.className = "wanaka-game-wall-content";

  const label = document.createElement("span");
  label.className = "wanaka-game-wall-card-label";
  label.textContent = i18n(
    themePrefix(
      index === 0 ? "featured_games.featured" : "featured_games.play",
    ),
  );

  const title = document.createElement("span");
  title.className = "wanaka-game-wall-card-title";
  title.textContent = topic.title;

  const cta = document.createElement("span");
  cta.className = "wanaka-game-wall-card-cta";
  cta.textContent = i18n(themePrefix("featured_games.card_cta"));
  cta.setAttribute("aria-hidden", "true");

  content.appendChild(label);
  content.appendChild(title);
  content.appendChild(cta);
  card.appendChild(media);
  card.appendChild(content);
  return card;
}

function buildHeader() {
  const header = document.createElement("header");
  header.className = "wanaka-game-wall-header";

  const copy = document.createElement("div");
  copy.className = "wanaka-game-wall-copy";

  const eyebrow = document.createElement("span");
  eyebrow.className = "wanaka-game-wall-eyebrow";
  eyebrow.textContent = i18n(themePrefix("featured_games.eyebrow"));

  const title = document.createElement("h1");
  title.id = "wanaka-game-wall-title";
  title.className = "wanaka-game-wall-title";
  title.textContent = i18n(themePrefix("featured_games.title"));

  const subtitle = document.createElement("p");
  subtitle.className = "wanaka-game-wall-subtitle";
  subtitle.textContent = i18n(themePrefix("featured_games.subtitle"));

  copy.appendChild(eyebrow);
  copy.appendChild(title);
  copy.appendChild(subtitle);

  const browseAll = document.createElement("a");
  browseAll.className = "wanaka-game-wall-browse";
  browseAll.href = settings.games_url;
  browseAll.textContent = i18n(themePrefix("featured_games.browse_all"));

  header.appendChild(copy);
  header.appendChild(browseAll);
  return header;
}

function buildCommunityIntro() {
  const intro = document.createElement("div");
  intro.className = "wanaka-community-intro";

  const eyebrow = document.createElement("span");
  eyebrow.className = "wanaka-community-eyebrow";
  eyebrow.textContent = i18n(themePrefix("featured_games.community_eyebrow"));

  const copy = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "wanaka-community-title";
  title.textContent = i18n(themePrefix("featured_games.community_title"));

  const subtitle = document.createElement("p");
  subtitle.className = "wanaka-community-subtitle";
  subtitle.textContent = i18n(themePrefix("featured_games.community_subtitle"));

  copy.appendChild(title);
  copy.appendChild(subtitle);
  intro.appendChild(eyebrow);
  intro.appendChild(copy);
  return intro;
}

function buildWall(topics) {
  const wall = document.createElement("section");
  wall.id = WALL_ID;
  wall.setAttribute("aria-labelledby", "wanaka-game-wall-title");

  const grid = document.createElement("div");
  grid.className = `wanaka-game-wall-grid wanaka-game-wall-grid--count-${topics.length}`;
  grid.setAttribute("role", "list");
  topics.forEach((topic, index) => grid.appendChild(buildCard(topic, index)));

  wall.appendChild(buildHeader());
  wall.appendChild(grid);
  wall.appendChild(buildCommunityIntro());
  return wall;
}

async function renderWall() {
  const generation = ++renderGeneration;
  document.getElementById(WALL_ID)?.remove();
  if (!isHomepage()) {
    return;
  }

  const topics = await loadWallTopics();
  if (topics.length === 0 || generation !== renderGeneration || !isHomepage()) {
    return;
  }

  for (let attempt = 0; attempt < MOUNT_RETRIES; attempt++) {
    const outlet = document.querySelector("#main-outlet");
    if (outlet) {
      if (
        generation !== renderGeneration ||
        document.getElementById(WALL_ID) ||
        !isHomepage()
      ) {
        return;
      }

      outlet.prepend(buildWall(topics));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, MOUNT_RETRY_MS));
  }
}

export default apiInitializer("1.8.0", (api) => {
  api.onPageChange(renderWall);
});
