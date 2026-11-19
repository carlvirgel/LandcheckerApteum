require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_view/railtie"
require "action_cable/engine"

Bundler.require(*Rails.groups)

module Landchecker
  class Application < Rails::Application
    config.load_defaults 8.1

    config.autoload_lib(ignore: %w[assets tasks])

    config.api_only = true
    config.time_zone = "Australia/Melbourne"
    config.action_controller.always_permitted_parameters = %w[controller action format]

    # Redis is shared by the cache, the controller rate limiter and ActionCable.
    # (test env overrides this with a null/memory store)
    config.cache_store = :redis_cache_store, {
      url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
      namespace: "landchecker:cache",
      expires_in: 1.hour,
      error_handler: ->(method:, returning:, exception:) {
        Rails.logger.warn("[cache] #{method} failed: #{exception.class}: #{exception.message}")
      }
    }

    # Broadcast fan-out runs in-process. Swap for Sidekiq/Solid Queue in production.
    config.active_job.queue_adapter = :async

    config.generators do |g|
      g.test_framework :rspec, fixtures: false, view_specs: false, helper_specs: false, routing_specs: false
      g.factory_bot dir: "spec/factories"
    end
  end
end
