# frozen_string_literal: true

RSpec.describe "Wanaka theme core features" do
  before do
    upload_theme_or_component

    # The shared Discourse smoke suite navigates from the homepage through the
    # open sidebar. Treat that browser as having already made its sidebar
    # choice; game_wall_spec.rb separately verifies Wanaka's first-homepage
    # collapsed default and the user's ability to reopen it.
    visit "/latest"
    page.execute_script(<<~JS)
      localStorage.removeItem("__test_discourse_sidebar-hidden");
      localStorage.setItem("__test_discourse_wanaka-sidebar-default-collapsed-v1", "true");
    JS
  end

  it_behaves_like "having working core features"
end
