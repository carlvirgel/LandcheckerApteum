# The test env uses :null_store. Tag an example/group with `:caching` to run it
# against a fresh in-memory store (needed for HTTP caching and rate limit specs).
RSpec.configure do |config|
  config.around(:each, :caching) do |example|
    original = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
    example.run
  ensure
    Rails.cache = original
  end
end
