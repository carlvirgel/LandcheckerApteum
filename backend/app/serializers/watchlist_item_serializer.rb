class WatchlistItemSerializer
  def self.collection(items)
    items.map { |item| new(item).as_json }
  end

  def initialize(item)
    @item = item
  end

  def as_json(*)
    {
      property_id: @item.property_id,
      price_at_save: @item.price_at_save,
      saved_at: @item.created_at.iso8601,
      property: PropertySerializer.new(@item.property).as_json
    }
  end
end
