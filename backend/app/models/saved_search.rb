class SavedSearch < ApplicationRecord
  MAX_PER_USER = 50

  belongs_to :user

  normalizes :name, with: ->(name) { name.squish }

  validates :name, presence: true, length: { maximum: 80 }, uniqueness: { scope: :user_id }
  validate :filters_are_a_valid_search
  validate :within_user_limit, on: :create

  # Store only the filter keys a search understands, never cursors/limits.
  def filters=(value)
    hash = value.respond_to?(:to_unsafe_h) ? value.to_unsafe_h : value.to_h
    super(hash.stringify_keys.slice(*PropertySearch::FILTER_KEYS).compact_blank)
  end

  private

  def filters_are_a_valid_search
    search = PropertySearch.new(filters || {})
    return if search.valid?

    search.errors.each { |error| errors.add(:filters, "#{error.attribute} #{error.message}") }
  end

  def within_user_limit
    return unless user && user.saved_searches.count >= MAX_PER_USER

    errors.add(:base, "You can save at most #{MAX_PER_USER} searches")
  end
end
