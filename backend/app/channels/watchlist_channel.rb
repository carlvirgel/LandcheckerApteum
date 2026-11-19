# One stream per user. The server fans a property change out to each watcher's
# stream, so a client needs a single subscription no matter how many properties
# it watches.
#
# Messages:
#   { type: "property.updated",  property: {...}, changes: { "price" => [old, new], "status" => [...] } }
#   { type: "watchlist.added",   property_id:, item: {...} }
#   { type: "watchlist.removed", property_id: }
class WatchlistChannel < ApplicationCable::Channel
  def self.broadcasting_for_user(user_id)
    "watchlist:user:#{user_id}"
  end

  def self.broadcast_to_user(user_id, payload)
    ActionCable.server.broadcast(broadcasting_for_user(user_id), payload)
  end

  def subscribed
    stream_from self.class.broadcasting_for_user(current_user.id)
  end
end
