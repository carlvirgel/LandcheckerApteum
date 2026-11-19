# Applies a plausible market event (price change, under offer, sold) to a property.
# Used by `bin/rails demo:market` to demonstrate real-time watchlist updates.
class MarketSimulator
  def initialize(rng: Random.new)
    @rng = rng
  end

  # Prefers properties somebody is watching so the demo produces visible notifications.
  def tick!
    property = pick_property
    return unless property

    apply_event(property)
    property
  end

  def apply_event(property)
    roll = @rng.rand
    if roll < 0.7 || !property.active?
      change = property.price * @rng.rand(0.02..0.08) * (@rng.rand < 0.6 ? -1 : 1)
      property.update!(price: [ ((property.price + change) / 5_000).round * 5_000, 5_000 ].max)
    elsif roll < 0.85
      property.update!(status: "under_offer")
    else
      property.update!(status: "sold")
    end
  end

  private

  def pick_property
    watched = Property.available.where(id: WatchlistItem.select(:property_id))
    (watched.exists? ? watched : Property.available).order(Arel.sql("RANDOM()")).first
  end
end
