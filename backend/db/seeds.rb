# Deterministic, realistic-looking Melbourne listings. Idempotent: safe to re-run.
#   bin/rails db:seed                                    # 5,000 properties
#   SEED_PROPERTIES=50000 bin/rails db:seed:replant      # wipe and reseed with more
require_relative "seeds/melbourne"

rng = Random.new(42)
count = ENV.fetch("SEED_PROPERTIES", 5_000).to_i
now = Time.current

puts "Seeding agencies..."
Agency.upsert_all(
  Seeds::Melbourne::AGENCIES.map { |name, phone| { name:, phone:, created_at: now, updated_at: now } },
  unique_by: :name
)
agency_ids = Agency.pluck(:id)

if Property.exists?
  puts "Properties already present (#{Property.count}); skipping."
else
  puts "Seeding #{count} properties..."
  count.times.each_slice(1_000) do |slice|
    rows = slice.map { Seeds::Melbourne.property_attributes(rng, agency_ids:, now:) }
    Property.insert_all!(rows)
  end
  Property.expire_search_cache! # insert_all skips callbacks
end

puts "Seeding users..."
demo = User.find_or_create_by!(email: "demo@example.com") do |user|
  user.name = "Demo User"
  user.password = "password123"
end
User.find_or_create_by!(email: "admin@example.com") do |user|
  user.name = "Admin"
  user.password = "password123"
  user.role = "admin"
end

if demo.watchlist_items.none?
  Property.available.where(suburb: %w[Richmond Fitzroy Brunswick Hawthorn]).order(:id).limit(6).each do |property|
    demo.watchlist_items.create!(property:)
  end
end

if demo.saved_searches.none?
  demo.saved_searches.create!(name: "Family homes in the inner north",
                              filters: { q: "brunswick", property_types: "house,townhouse", min_bedrooms: 3, max_price: 1_800_000 })
  demo.saved_searches.create!(name: "Apartments under $700k",
                              filters: { property_types: "apartment", max_price: 700_000, sort: "price_asc" })
end

puts "Done: #{Property.count} properties, #{User.count} users (demo@example.com / password123)."
