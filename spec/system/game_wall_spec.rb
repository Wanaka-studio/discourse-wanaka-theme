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
        )
      Fabricate(:post, topic: topic)
      topic
    end
  end
  fab!(:showcase_topics) do
    7.times.map do |index|
      topic =
        Fabricate(
          :topic,
          title: "Showcase game number #{index + 1}",
          category: game_category,
        )
      Fabricate(:post, topic: topic)
      topic
    end
  end

  before do
    SiteSetting.tagging_enabled = true
    upload_theme_or_component
  end

  it "renders nine unique games above the native forum only on the homepage" do
    visit "/"

    expect(page).to have_css("#wanaka-game-wall")
    expect(page).to have_css(".wanaka-game-wall-grid--count-9")
    expect(page).to have_css(".wanaka-game-wall-card", count: 9)
    expect(page).to have_css(".wanaka-game-wall-media--placeholder", count: 9)
    expect(page).to have_css(".topic-list")

    positions =
      page.evaluate_script(<<~JS)
        (() => {
          const wall = document.querySelector("#wanaka-game-wall").getBoundingClientRect();
          const topicList = document.querySelector(".topic-list").getBoundingClientRect();
          return { wallBottom: wall.bottom, topicListTop: topicList.top };
        })()
      JS
    expect(positions["wallBottom"]).to be <= positions["topicListTop"]

    visit "/latest"

    expect(page).to have_no_css("#wanaka-game-wall")
    expect(page).to have_css(".topic-list")
  end
end
