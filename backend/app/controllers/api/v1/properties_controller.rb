module Api
  module V1
    class PropertiesController < ApplicationController
      SEARCH_CACHE_TTL = 10.minutes

      before_action :require_admin!, only: :update

      # GET /api/v1/properties
      #   ?q=&min_price=&max_price=&min_bedrooms=&max_bedrooms=&property_types=house,unit
      #   &status=active,under_offer&lat=&lng=&radius_km=&sort=newest|price_asc|price_desc|distance
      #   &limit=24&cursor=<opaque>
      #
      # Responses are identical for every user, so they're cached in Redis and
      # validated with an ETag (clients get a 304 without touching the database).
      def index
        search = PropertySearch.new(search_params)
        raise ErrorHandling::InvalidParams, search.errors unless search.valid?

        version = Property.search_cache_version
        cache_publicly_but_revalidate
        return unless stale?(etag: [ version, search.cache_key ])

        body = Rails.cache.fetch([ "properties/search", version, search.cache_key ], expires_in: SEARCH_CACHE_TTL) do
          page = search.results
          {
            data: PropertySerializer.collection(page.records),
            meta: { next_cursor: page.next_cursor, has_more: page.next_cursor.present?,
                    total_count: page.total_count, limit: search.limit }.compact
          }.to_json
        end

        render json: body
      end

      # GET /api/v1/properties/:id
      def show
        property = Property.includes(:agency).find(params[:id])
        cache_publicly_but_revalidate
        return unless stale?(property)

        render json: { data: PropertySerializer.new(property, detail: true).as_json }
      end

      # PATCH /api/v1/properties/:id  (admin) { property: { price, status, ... } }
      # Price/status changes are pushed to watchers over ActionCable.
      def update
        property = Property.includes(:agency).find(params[:id])
        property.update!(params.require(:property).permit(:price, :status, :title, :description))

        render json: { data: PropertySerializer.new(property, detail: true).as_json }
      end

      private

      # "public, no-cache": any cache (browser, CDN) may store the response because it is
      # identical for every user, but must revalidate it with the ETag each time, so a
      # cached copy can never hide a price change that was just pushed over the socket.
      def cache_publicly_but_revalidate
        response.cache_control.merge!(public: true, no_cache: true)
      end

      def search_params
        params.permit(*PropertySearch::FILTER_KEYS, :limit, :cursor,
                      property_types: [], status: []).to_h
      end
    end
  end
end
