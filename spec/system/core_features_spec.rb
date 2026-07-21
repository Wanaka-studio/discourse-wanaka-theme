# frozen_string_literal: true

RSpec.describe "Wanaka theme core features" do
  before do
    upload_theme_or_component

    # The shared Discourse smoke suite navigates through the open sidebar. Make
    # the same supported choice a returning user would: open it once, then let
    # Discourse persist that choice. game_wall_spec.rb separately verifies the
    # first-homepage collapsed default.
    visit "/"
    expect(page).to have_css(".header-sidebar-toggle")
    find(".header-sidebar-toggle").click if page.has_no_css?("#d-sidebar")
    expect(page).to have_css("#sidebar-section-content-categories")
  end

  it_behaves_like "having working core features"
end
