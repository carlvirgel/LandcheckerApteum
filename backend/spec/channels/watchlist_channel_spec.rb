require "rails_helper"

RSpec.describe WatchlistChannel do
  let(:user) { create(:user) }

  it "streams the current user's watchlist events" do
    stub_connection current_user: user
    subscribe

    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_from("watchlist:user:#{user.id}")
  end
end
