# frozen_string_literal: true

RSpec.describe "Wanaka homepage game wall" do
  fab!(:featured_tag) { Fabricate(:tag, name: "featured") }
  fab!(:game_category) do
    Fabricate(:category, name: "Game Showcase", slug: "game-showcase")
  end
  fab!(:featured_topics) do
    2.times.map do |index|
      topic =
        Fabricate(
          :topic,
          title: "Featured game number #{index + 1}",
          category: game_category,
          tags: [featured_tag],
          image_upload: Fabricate(:image_upload, width: 1600, height: 900),
        )
      Fabricate(:post, topic: topic)
      topic
    end
  end
  fab!(:showcase_topics) do
    6.times.map do |index|
      topic =
        Fabricate(
          :topic,
          title: "Showcase game number #{index + 1}",
          category: game_category,
          image_upload: Fabricate(:image_upload, width: 1600, height: 900),
        )
      Fabricate(:post, topic: topic)
      topic
    end
  end
  fab!(:guide_topics) do
    ["How to share your game", "About the Game Showcase category"].map do |title|
      topic = Fabricate(:topic, title:, category: game_category)
      Fabricate(:post, topic: topic)
      topic
    end
  end

  before do
    SiteSetting.tagging_enabled = true
    SiteSetting.navigation_menu = "sidebar"
    upload_theme_or_component
  end

  it "fills the first screen with a seamless rail of cover-bearing games" do
    visit "/"

    expect(page).to have_css("#wanaka-game-wall")
    expect(page).to have_css(
      ".wanaka-game-wall-group--primary .wanaka-game-wall-card",
      count: 8,
    )
    expect(page).to have_css(
      ".wanaka-game-wall-group--clone[aria-hidden='true'] .wanaka-game-wall-card[tabindex='-1']",
      count: 8,
    )
    expect(page).to have_css(
      ".wanaka-game-wall-group--primary .wanaka-game-wall-media img",
      count: 8,
    )
    expect(page).to have_no_css(".wanaka-game-wall-media--placeholder")
    expect(page).to have_no_css(".wanaka-community-intro")
    within("#wanaka-game-wall") do
      expect(page).to have_no_link("How to share your game", exact: true)
      expect(page).to have_no_link(
        "About the Game Showcase category",
        exact: true,
      )
    end
    expect(page).to have_css(".topic-list")
    expect(page).to have_no_css("#d-sidebar")
    expect(page).to have_css(".header-sidebar-toggle")

    browser_state =
      page.evaluate_script(<<~JS)
        (() => {
          const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
          return {
            sidebarHidden: keys.some((key) => key.endsWith("sidebar-hidden") && localStorage.getItem(key) === "true"),
            defaultApplied: keys.some((key) => key.endsWith("wanaka-sidebar-default-collapsed-v1") && localStorage.getItem(key) === "true"),
          };
        })()
      JS
    expect(browser_state).to eq(
      "sidebarHidden" => true,
      "defaultApplied" => true,
    )

    layout =
      page.evaluate_script(<<~JS)
        (() => {
          const stage = document.querySelector(".wanaka-game-wall-stage").getBoundingClientRect();
          const wall = document.querySelector("#wanaka-game-wall").getBoundingClientRect();
          const topicList = document.querySelector(".topic-list").getBoundingClientRect();
          const track = document.querySelector(".wanaka-game-wall-track");
          const group = document.querySelector(".wanaka-game-wall-group--primary");
          const cards = Array.from(group.querySelectorAll(".wanaka-game-wall-card"));
          return {
            stageLeft: stage.left,
            stageWidth: stage.width,
            viewportWidth: window.innerWidth,
            stageHeight: stage.height,
            viewportHeight: window.innerHeight,
            wallBottom: wall.bottom,
            topicListTop: topicList.top,
            animationName: getComputedStyle(track).animationName,
            duration: track.style.getPropertyValue("--wanaka-wall-duration"),
            groupDisplay: getComputedStyle(group).display,
            groupRows: getComputedStyle(group).gridTemplateRows.split(" ").length,
            heroHeight: cards[0].getBoundingClientRect().height,
            supportHeight: cards[1].getBoundingClientRect().height,
          };
        })()
      JS
    expect(layout["stageLeft"].abs).to be <= 1
    expect(layout["stageWidth"]).to be_within(2).of(layout["viewportWidth"])
    expect(layout["stageHeight"]).to be >= layout["viewportHeight"] - 66
    expect(layout["wallBottom"]).to be <= layout["topicListTop"]
    expect(layout["animationName"]).to eq("wanaka-game-wall-marquee")
    expect(layout["duration"]).to eq("144s")
    expect(layout["groupDisplay"]).to eq("grid")
    expect(layout["groupRows"]).to eq(4)
    expect(layout["heroHeight"]).to be > layout["supportHeight"]

    find(".header-sidebar-toggle").click
    expect(page).to have_css("#d-sidebar")

    visit "/latest"

    expect(page).to have_no_css("#wanaka-game-wall")
    expect(page).to have_css(".topic-list")
    expect(page).to have_css("#d-sidebar")
  end
end
