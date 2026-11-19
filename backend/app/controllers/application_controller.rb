class ApplicationController < ActionController::API
  include ErrorHandling
  include Authentication
  include RateLimited

  # Global per-user (or per-IP when anonymous) budget across the whole API
  throttle name: "api", to: ENV.fetch("API_RATE_LIMIT", 300).to_i, within: 1.minute
end
