module Api
  module V1
    # The signed-in user's watchlist, addressed by property id:
    #   GET    /api/v1/watchlist               list (newest first)
    #   POST   /api/v1/watchlist {property_id} add    -> 201 Created, or 200 if already watched
    #   DELETE /api/v1/watchlist/:property_id  remove -> 204 (idempotent)
    class WatchlistItemsController < ApplicationController
      MAX_ITEMS = 500

      before_action :require_authentication!

      def index
        items = current_user.watchlist_items
          .includes(property: :agency) # 3 queries total regardless of list size
          .strict_loading
          .order(created_at: :desc, id: :desc)
          .limit(MAX_ITEMS)

        render json: { data: WatchlistItemSerializer.collection(items) }
      end

      def create
        property = Property.includes(:agency).find(params.require(:property_id))
        item = current_user.watchlist_items.find_or_create_by!(property:)
        item.property = property # reuse the eager-loaded record for serialization

        render json: { data: WatchlistItemSerializer.new(item).as_json },
               status: item.previously_new_record? ? :created : :ok
      rescue ActiveRecord::RecordNotUnique
        retry # lost a race with a concurrent add (double click / second tab); the row exists now
      end

      def destroy
        current_user.watchlist_items.find_by(property_id: params[:property_id])&.destroy!
        head :no_content
      end
    end
  end
end
