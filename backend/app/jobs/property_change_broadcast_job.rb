# Notifies every user watching a property that its price/status changed.
# Runs off the request thread because a popular property may have many watchers.
class PropertyChangeBroadcastJob < ApplicationJob
  queue_as :realtime

  BATCH_SIZE = 1_000

  def perform(property_id, changes)
    property = Property.includes(:agency).find_by(id: property_id)
    return unless property

    payload = {
      type: "property.updated",
      property: PropertySerializer.new(property).as_json,
      changes: changes
    }

    WatchlistItem.where(property_id: property.id).in_batches(of: BATCH_SIZE) do |batch|
      batch.pluck(:user_id).each { |user_id| WatchlistChannel.broadcast_to_user(user_id, payload) }
    end
  end
end
