# Validates search params and builds an index-friendly, keyset-paginated query.
#
#   search = PropertySearch.new(q: "richmond", min_price: 500_000, property_types: "house,townhouse")
#   search.valid?   # => true
#   page = search.results
#   page.records / page.next_cursor / page.total_count
#
# Keyset (cursor) pagination is used instead of OFFSET so deep pages stay O(limit)
# and infinite scroll never skips/duplicates rows when listings are added.
class PropertySearch
  include ActiveModel::Validations

  FILTER_KEYS = %w[q min_price max_price min_bedrooms max_bedrooms property_types status lat lng radius_km sort].freeze

  # Fixed SQL fragments; user input only ever reaches the database as bind values.
  DISTANCE_SQL = "earth_distance(ll_to_earth(:lat, :lng), ll_to_earth(properties.latitude, properties.longitude))".freeze
  # Straight-line (chord) distance between the 3D points: orders identically to the
  # great-circle distance, but the GiST index can return rows nearest-first (KNN)
  # so a page is read straight off the index instead of sorting every match.
  KNN_SQL = "ll_to_earth(properties.latitude, properties.longitude) <-> ll_to_earth(:lat, :lng)".freeze
  DISTANCE_SELECT_SQL = "#{DISTANCE_SQL} AS distance_m, #{KNN_SQL} AS distance_key".freeze
  WITHIN_BOX_SQL = "earth_box(ll_to_earth(:lat, :lng), :radius_m) @> ll_to_earth(properties.latitude, properties.longitude)".freeze
  WITHIN_RADIUS_SQL = "#{DISTANCE_SQL} <= :radius_m".freeze

  # Each sort orders by (column, id) and pages with a row-value comparison against
  # the last row seen, which the matching composite index can seek to directly.
  SORT_SQL = {
    "newest" => { order: "properties.listed_at DESC, properties.id DESC",
                  after: "(properties.listed_at, properties.id) < (:value, :id)" },
    "price_asc" => { order: "properties.price ASC, properties.id ASC",
                     after: "(properties.price, properties.id) > (:value, :id)" },
    "price_desc" => { order: "properties.price DESC, properties.id DESC",
                      after: "(properties.price, properties.id) < (:value, :id)" },
    "distance" => { order: "#{KNN_SQL} ASC, properties.id ASC",
                    after: "(#{KNN_SQL}, properties.id) > (:value, :id)" }
  }.freeze
  SORTS = SORT_SQL.keys.freeze
  DEFAULT_LIMIT = 24
  MAX_LIMIT = 50
  MAX_RADIUS_KM = 50
  MAX_QUERY_TERMS = 5
  MAX_BEDROOMS = 20

  Page = Data.define(:records, :next_cursor, :total_count)

  attr_reader :q, :min_price, :max_price, :min_bedrooms, :max_bedrooms, :property_types, :statuses,
              :lat, :lng, :radius_km, :sort, :limit, :cursor

  validate :params_parse
  validate :price_range
  validate :bedroom_range
  validate :enum_values
  validate :location
  validate :sort_and_limit
  validate :cursor_matches_sort

  def initialize(params = {})
    params = params.to_h.stringify_keys
    @parse_errors = []

    @q = params["q"].to_s.squish.first(100).presence
    @min_price = integer_param(params, "min_price")
    @max_price = integer_param(params, "max_price")
    @min_bedrooms = integer_param(params, "min_bedrooms")
    @max_bedrooms = integer_param(params, "max_bedrooms")
    @property_types = list_param(params, "property_types")
    @statuses = list_param(params, "status").presence || Property::AVAILABLE_STATUSES
    @lat = float_param(params, "lat")
    @lng = float_param(params, "lng")
    @radius_km = float_param(params, "radius_km")
    @sort = params["sort"].presence || (near? ? "distance" : "newest")
    @limit = integer_param(params, "limit") || DEFAULT_LIMIT
    @cursor = params["cursor"].presence
  end

  def near?
    !lat.nil? && !lng.nil? && !radius_km.nil?
  end

  def results
    raise ArgumentError, "invalid search: #{errors.full_messages.to_sentence}" unless valid?

    rows = paginated_scope.to_a
    has_more = rows.length > limit
    rows = rows.first(limit)

    Page.new(
      records: rows,
      next_cursor: has_more ? encode_cursor(rows.last) : nil,
      # COUNT(*) is only worth paying for on the first page
      total_count: cursor ? nil : filtered_scope.count
    )
  end

  # Normalised representation of the query, used for cache keys and ETags.
  def cache_key
    normalized = [
      q&.downcase, min_price, max_price, min_bedrooms, max_bedrooms, property_types.sort,
      statuses.sort, lat, lng, radius_km, sort, limit, cursor
    ]
    Digest::SHA256.hexdigest(normalized.to_json)
  end

  private

  # ---- query building ------------------------------------------------------

  def filtered_scope
    scope = Property.where(status: statuses)
    scope = scope.where(property_type: property_types) if property_types.any?
    scope = scope.where(price: min_price..) if min_price
    scope = scope.where(price: ..max_price) if max_price
    scope = scope.where(bedrooms: min_bedrooms..) if min_bedrooms
    scope = scope.where(bedrooms: ..max_bedrooms) if max_bedrooms

    # Each term must appear somewhere in the address; served by the trigram GIN index.
    query_terms.each do |term|
      scope = scope.where("properties.search_text LIKE ?", "%#{Property.sanitize_sql_like(term)}%")
    end

    if near?
      # earth_box is a fast, index-backed bounding cube; earth_distance trims it to a true circle.
      scope = scope.where(WITHIN_BOX_SQL, geo_binds).where(WITHIN_RADIUS_SQL, geo_binds)
    end

    scope
  end

  def paginated_scope
    spec = SORT_SQL.fetch(sort)
    scope = filtered_scope.includes(:agency).strict_loading
    scope = scope.select("properties.*", Property.sanitize_sql_array([ DISTANCE_SELECT_SQL, geo_binds ])) if near?

    if cursor
      value, id = decoded_cursor.values_at("v", "id")
      value = Time.iso8601(value) if sort == "newest"
      scope = scope.where(spec[:after], geo_binds.merge(value:, id:))
    end

    scope.order(Arel.sql(Property.sanitize_sql_array([ spec[:order], geo_binds ]))).limit(limit + 1)
  end

  def geo_binds
    { lat:, lng:, radius_m: radius_km.to_f * 1000 }
  end

  def query_terms
    return [] unless q

    q.downcase.split(/[\s,]+/).reject(&:blank?).uniq.first(MAX_QUERY_TERMS)
  end

  # ---- cursors -------------------------------------------------------------

  def encode_cursor(record)
    value =
      case sort
      when "newest" then record.listed_at.utc.iso8601(6)
      when "price_asc", "price_desc" then record.price
      when "distance" then record.distance_key
      end

    Base64.urlsafe_encode64({ s: sort, v: value, id: record.id }.to_json, padding: false)
  end

  def decoded_cursor
    @decoded_cursor ||= begin
      data = JSON.parse(Base64.urlsafe_decode64(cursor))
      data.is_a?(Hash) && data["id"].is_a?(Integer) && !data["v"].nil? ? data : nil
    rescue ArgumentError, JSON::ParserError
      nil
    end
  end

  # ---- param parsing -------------------------------------------------------

  def integer_param(params, key)
    raw = params[key]
    return nil if raw.blank?
    return raw if raw.is_a?(Integer)

    Integer(raw.to_s.strip, 10)
  rescue ArgumentError, TypeError
    @parse_errors << [ key, "must be a whole number" ]
    nil
  end

  def float_param(params, key)
    raw = params[key]
    return nil if raw.blank?

    Float(raw.to_s.strip)
  rescue ArgumentError, TypeError
    @parse_errors << [ key, "must be a number" ]
    nil
  end

  # Accepts "house,unit" or ["house", "unit"]
  def list_param(params, key)
    Array(params[key]).flat_map { |value| value.to_s.split(",") }.map(&:strip).reject(&:blank?).uniq
  end

  # ---- validations ---------------------------------------------------------

  def params_parse
    @parse_errors.each { |key, message| errors.add(key, message) }
  end

  def price_range
    errors.add(:min_price, "must be greater than or equal to 0") if min_price&.negative?
    errors.add(:max_price, "must be greater than or equal to 0") if max_price&.negative?
    if min_price && max_price && min_price > max_price
      errors.add(:max_price, "must be greater than or equal to min_price")
    end
  end

  def bedroom_range
    { min_bedrooms:, max_bedrooms: }.each do |key, value|
      next if value.nil? || value.between?(0, MAX_BEDROOMS)

      errors.add(key, "must be between 0 and #{MAX_BEDROOMS}")
    end
    if min_bedrooms && max_bedrooms && min_bedrooms > max_bedrooms
      errors.add(:max_bedrooms, "must be greater than or equal to min_bedrooms")
    end
  end

  def enum_values
    invalid_types = property_types - Property::TYPES
    errors.add(:property_types, "contains unknown values: #{invalid_types.join(', ')}") if invalid_types.any?

    invalid_statuses = statuses - Property::STATUSES
    errors.add(:status, "contains unknown values: #{invalid_statuses.join(', ')}") if invalid_statuses.any?
  end

  def location
    given = [ lat, lng, radius_km ].compact.size
    return if given.zero?
    return errors.add(:base, "lat, lng and radius_km must be provided together") unless given == 3

    errors.add(:lat, "must be between -90 and 90") unless lat.between?(-90, 90)
    errors.add(:lng, "must be between -180 and 180") unless lng.between?(-180, 180)
    errors.add(:radius_km, "must be greater than 0 and at most #{MAX_RADIUS_KM}") unless radius_km.positive? && radius_km <= MAX_RADIUS_KM
  end

  def sort_and_limit
    errors.add(:sort, "must be one of: #{SORTS.join(', ')}") unless SORTS.include?(sort)
    errors.add(:sort, "distance requires lat, lng and radius_km") if sort == "distance" && !near?
    errors.add(:limit, "must be between 1 and #{MAX_LIMIT}") unless limit.between?(1, MAX_LIMIT)
  end

  def cursor_matches_sort
    return unless cursor

    if decoded_cursor.nil?
      errors.add(:cursor, "is invalid")
    elsif decoded_cursor["s"] != sort
      errors.add(:cursor, "does not match the requested sort order")
    elsif sort == "newest"
      Time.iso8601(decoded_cursor["v"].to_s)
    end
  rescue ArgumentError
    errors.add(:cursor, "is invalid")
  end
end
