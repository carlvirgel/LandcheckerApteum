# Thin wrapper over Rails 8's built-in `rate_limit` (a fixed-window counter in
# Rails.cache / Redis) that renders the standard error envelope with Retry-After.
module RateLimited
  extend ActiveSupport::Concern

  # Resolves Rails.cache on every call (rather than when the class loads) so the
  # store can be swapped, e.g. by specs.
  module Store
    def self.increment(...) = Rails.cache.increment(...)
  end

  class_methods do
    def throttle(name:, to:, within:, by: -> { rate_limit_identity }, **options)
      rate_limit(to:, within:, by:, name:, scope: name, store: Store,
                 with: -> { render_rate_limited(within) }, **options)
    end
  end

  private

  def rate_limit_identity
    current_user ? "user:#{current_user.id}" : "ip:#{request.remote_ip}"
  end

  def render_rate_limited(within)
    response.set_header("Retry-After", within.to_i.to_s)
    render_error(status: :too_many_requests, code: "rate_limited",
                 message: "Too many requests. Please retry in #{within.inspect}.")
  end
end
