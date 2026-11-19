require "rails_helper"

RSpec.describe PropertyChangeBroadcastJob do
  let(:property) { create(:property, price: 1_000_000) }
  let(:watchers) { create_list(:user, 2) }
  let(:bystander) { create(:user) }

  before { watchers.each { |user| create(:watchlist_item, user:, property:) } }

  it "pushes the updated property to every watcher and nobody else" do
    property.update_columns(price: 950_000)
    changes = { "price" => [ 1_000_000, 950_000 ] }

    watchers.each do |user|
      expect { described_class.perform_now(property.id, changes) }
        .to have_broadcasted_to(WatchlistChannel.broadcasting_for_user(user.id)).with(
          hash_including("type" => "property.updated", "changes" => changes,
                         "property" => hash_including("id" => property.id, "price" => 950_000))
        )
    end
    expect { described_class.perform_now(property.id, changes) }
      .not_to have_broadcasted_to(WatchlistChannel.broadcasting_for_user(bystander.id))
  end

  it "does nothing if the property has since been deleted" do
    id = property.id
    property.destroy!
    expect { described_class.perform_now(id, {}) }.not_to raise_error
  end
end
