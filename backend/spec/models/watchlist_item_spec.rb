require "rails_helper"

RSpec.describe WatchlistItem do
  let(:user) { create(:user) }
  let(:property) { create(:property, price: 1_250_000) }

  it "snapshots the price at the time it was saved" do
    item = described_class.create!(user:, property:)
    property.update!(price: 1_100_000)

    expect(item.reload.price_at_save).to eq(1_250_000)
  end

  it "allows a property only once per user" do
    described_class.create!(user:, property:)
    duplicate = described_class.new(user:, property:)

    expect(duplicate).not_to be_valid
    expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "broadcasts membership changes to the owner's stream" do
    stream = WatchlistChannel.broadcasting_for_user(user.id)

    expect { @item = described_class.create!(user:, property:) }
      .to have_broadcasted_to(stream).with(hash_including("type" => "watchlist.added", "property_id" => property.id))
    expect { @item.destroy! }
      .to have_broadcasted_to(stream).with({ "type" => "watchlist.removed", "property_id" => property.id })
  end
end
