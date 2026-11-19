require "rails_helper"

RSpec.describe "Watchlist API" do
  let(:user) { create(:user) }
  let(:property) { create(:property, price: 1_200_000) }

  it "requires authentication for every action" do
    get "/api/v1/watchlist"
    expect(response).to have_http_status(:unauthorized)

    post "/api/v1/watchlist", params: { property_id: property.id }.to_json, headers: json_headers
    expect(response).to have_http_status(:unauthorized)

    delete "/api/v1/watchlist/#{property.id}"
    expect(response).to have_http_status(:unauthorized)
  end

  describe "GET /api/v1/watchlist" do
    it "lists only the current user's items, newest first, with embedded properties" do
      older = create(:watchlist_item, user:, created_at: 2.days.ago)
      newer = create(:watchlist_item, user:, created_at: 1.hour.ago)
      create(:watchlist_item) # someone else's

      get "/api/v1/watchlist", headers: auth_headers(user)

      expect(json["data"].pluck("property_id")).to eq([ newer.property_id, older.property_id ])
      expect(json["data"].first["property"]).to include("id" => newer.property_id, "agency" => a_kind_of(Hash))
      expect(json["data"].first).to include("price_at_save", "saved_at")
    end

    it "uses a constant number of queries" do
      create(:watchlist_item, user:)
      small = count_queries { get "/api/v1/watchlist", headers: auth_headers(user) }

      5.times { create(:watchlist_item, user:, property: create(:property, agency: create(:agency))) }
      large = count_queries { get "/api/v1/watchlist", headers: auth_headers(user) }

      expect(large).to eq(small)
    end
  end

  describe "POST /api/v1/watchlist" do
    it "adds the property and snapshots its price" do
      post "/api/v1/watchlist", params: { property_id: property.id }.to_json, headers: json_headers(user)

      expect(response).to have_http_status(:created)
      expect(json["data"]).to include("property_id" => property.id, "price_at_save" => 1_200_000)
      expect(user.watched_properties).to eq([ property ])
    end

    it "is idempotent" do
      2.times { post "/api/v1/watchlist", params: { property_id: property.id }.to_json, headers: json_headers(user) }

      expect(response).to have_http_status(:ok)
      expect(user.watchlist_items.count).to eq(1)
    end

    it "returns 404 for an unknown property" do
      post "/api/v1/watchlist", params: { property_id: 0 }.to_json, headers: json_headers(user)
      expect(response).to have_http_status(:not_found)
    end

    it "returns 400 without a property_id" do
      post "/api/v1/watchlist", params: {}.to_json, headers: json_headers(user)
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "DELETE /api/v1/watchlist/:property_id" do
    it "removes the property and is idempotent" do
      create(:watchlist_item, user:, property:)

      delete "/api/v1/watchlist/#{property.id}", headers: auth_headers(user)
      expect(response).to have_http_status(:no_content)
      expect(user.watchlist_items).to be_empty

      delete "/api/v1/watchlist/#{property.id}", headers: auth_headers(user)
      expect(response).to have_http_status(:no_content)
    end

    it "cannot remove another user's item" do
      other_item = create(:watchlist_item, property:)

      delete "/api/v1/watchlist/#{property.id}", headers: auth_headers(user)

      expect(WatchlistItem.exists?(other_item.id)).to be(true)
    end
  end
end
