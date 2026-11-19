# The SPA talks to the API through a same-origin proxy in development (Vite) and
# production (nginx), so CORS is only needed when the frontend is hosted elsewhere.
origins = ENV.fetch("CORS_ORIGINS", "http://localhost:5173").split(",").map(&:strip)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*origins)

    resource "/api/*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      expose: %w[ETag Retry-After X-Request-Id],
      max_age: 600
  end
end
