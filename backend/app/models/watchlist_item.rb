class WatchlistItem < ApplicationRecord
  belongs_to :user
  belongs_to :property

  validates :property_id, uniqueness: { scope: :user_id }
  validates :price_at_save, numericality: { only_integer: true, greater_than: 0 }

  before_validation :snapshot_price, on: :create

  # Keep the user's other tabs/devices in sync
  after_create_commit -> { broadcast_membership("watchlist.added") }
  after_destroy_commit -> { broadcast_membership("watchlist.removed") }

  private

  def snapshot_price
    self.price_at_save ||= property&.price
  end

  def broadcast_membership(type)
    payload = { type: type, property_id: property_id }
    payload[:item] = WatchlistItemSerializer.new(self).as_json if type == "watchlist.added"
    WatchlistChannel.broadcast_to_user(user_id, payload)
  end
end
