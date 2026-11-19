module Api
  module V1
    class SavedSearchesController < ApplicationController
      before_action :require_authentication!

      # GET /api/v1/saved_searches
      def index
        searches = current_user.saved_searches.order(created_at: :desc)
        render json: { data: SavedSearchSerializer.collection(searches) }
      end

      # POST /api/v1/saved_searches  { name, filters: { q, min_price, ... } }
      def create
        search = current_user.saved_searches.create!(
          name: params.require(:name),
          filters: params.fetch(:filters, {}).permit(*PropertySearch::FILTER_KEYS, property_types: [], status: [])
        )
        render json: { data: SavedSearchSerializer.new(search).as_json }, status: :created
      end

      # DELETE /api/v1/saved_searches/:id
      def destroy
        current_user.saved_searches.find(params[:id]).destroy!
        head :no_content
      end
    end
  end
end
