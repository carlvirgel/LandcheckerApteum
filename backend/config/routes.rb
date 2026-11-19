Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount ActionCable.server => "/cable"

  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      # Auth
      post "auth/signup", to: "auth#signup"
      post "auth/login",  to: "auth#login"
      get  "auth/me",     to: "auth#me"

      # Public search; updates are admin-only (used to demo real-time changes)
      resources :properties, only: %i[index show update]

      # The current user's watchlist. Members are addressed by property id so that
      # add/remove are idempotent and the client never needs a join-table id.
      resources :watchlist, only: %i[index create destroy],
                            controller: "watchlist_items", param: :property_id

      resources :saved_searches, only: %i[index create destroy]
    end
  end
end
