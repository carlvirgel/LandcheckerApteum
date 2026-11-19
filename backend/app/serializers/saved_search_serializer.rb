class SavedSearchSerializer
  def self.collection(searches)
    searches.map { |search| new(search).as_json }
  end

  def initialize(search)
    @search = search
  end

  def as_json(*)
    { id: @search.id, name: @search.name, filters: @search.filters, created_at: @search.created_at.iso8601 }
  end
end
