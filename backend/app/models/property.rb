class Property < ApplicationRecord
  TYPES = %w[house apartment townhouse unit villa land].freeze
  STATUSES = %w[active under_offer sold withdrawn].freeze
  AVAILABLE_STATUSES = %w[active under_offer].freeze
  # Attribute changes that watchers are notified about in real time
  MARKET_ATTRIBUTES = %w[price status].freeze

  belongs_to :agency
  has_many :watchlist_items, dependent: :delete_all

  enum :property_type, TYPES.index_by(&:itself), validate: true
  enum :status, STATUSES.index_by(&:itself), default: "active", validate: true

  validates :title, :street_address, :suburb, :state, :listed_at, presence: true
  validates :postcode, format: { with: /\A\d{4}\z/ }
  validates :price, numericality: { only_integer: true, greater_than: 0, less_than: 2_000_000_000 }
  validates :bedrooms, :bathrooms, :car_spaces,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 50 }
  validates :land_size_sqm, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :latitude, numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
  validates :longitude, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }

  scope :available, -> { where(status: AVAILABLE_STATUSES) }

  after_update_commit :broadcast_market_change, if: :market_change?
  after_commit :expire_search_cache

  class << self
    # Search results are cached under a version key that changes whenever any
    # property is written, so a stale page can never be served after an update.
    # Bulk writes (insert_all/update_all) skip callbacks and must call
    # expire_search_cache! themselves.
    def search_cache_version
      Rails.cache.fetch("properties/search_version") { SecureRandom.hex(8) }
    end

    def expire_search_cache!
      Rails.cache.write("properties/search_version", SecureRandom.hex(8))
    end
  end

  def full_address
    "#{street_address}, #{suburb} #{state} #{postcode}"
  end

  private

  def market_change?
    MARKET_ATTRIBUTES.any? { |attribute| saved_change_to_attribute?(attribute) }
  end

  def broadcast_market_change
    changes = saved_changes.slice(*MARKET_ATTRIBUTES)
    PropertyChangeBroadcastJob.perform_later(id, changes)
  end

  def expire_search_cache
    self.class.expire_search_cache!
  end
end
