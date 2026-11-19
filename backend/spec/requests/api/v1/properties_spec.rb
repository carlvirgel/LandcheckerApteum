require "rails_helper"

RSpec.describe "Properties API" do
  describe "GET /api/v1/properties" do
    it "returns a page of properties with pagination metadata" do
      create_list(:property, 3)

      get "/api/v1/properties", params: { limit: 2 }

      expect(response).to have_http_status(:ok)
      expect(json["data"].size).to eq(2)
      expect(json["data"].first.keys).to include("id", "price", "bedrooms", "property_type", "status", "full_address", "agency")
      expect(json["meta"]).to include("has_more" => true, "total_count" => 3, "limit" => 2)
      expect(json["meta"]["next_cursor"]).to be_present
    end

    it "follows next_cursor to the end of the results" do
      create_list(:property, 5)

      ids = []
      cursor = nil
      loop do
        get "/api/v1/properties", params: { limit: 2, cursor: }.compact
        ids.concat(json["data"].pluck("id"))
        cursor = json["meta"]["next_cursor"]
        break unless cursor
      end

      expect(ids).to match_array(Property.ids)
      expect(json["meta"]["has_more"]).to be(false)
    end

    it "applies filters from query params" do
      match = create(:property, property_type: "townhouse", price: 800_000, bedrooms: 3, suburb: "Fitzroy")
      create(:property, property_type: "townhouse", price: 800_000, bedrooms: 1, suburb: "Fitzroy")
      create(:property, property_type: "house", price: 800_000, bedrooms: 3, suburb: "Fitzroy")
      create(:property, property_type: "townhouse", price: 2_000_000, bedrooms: 3, suburb: "Fitzroy")

      get "/api/v1/properties", params: { q: "fitzroy", property_types: "townhouse,unit", min_bedrooms: 3,
                                          min_price: 500_000, max_price: 1_000_000 }

      expect(json["data"].pluck("id")).to eq([ match.id ])
    end

    it "returns 422 with details for invalid params" do
      get "/api/v1/properties", params: { min_price: "cheap", limit: 1000 }

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]["code"]).to eq("invalid_params")
      expect(json["error"]["details"].keys).to contain_exactly("min_price", "limit")
    end

    it "does not issue N+1 queries as the page grows" do
      create_list(:property, 2)
      small = count_queries { get "/api/v1/properties" }

      10.times { create(:property, agency: create(:agency)) }
      large = count_queries { get "/api/v1/properties" }

      expect(large).to eq(small)
      expect(large).to be <= 3 # properties + agencies + count
    end

    context "with HTTP and Redis caching", :caching do
      it "answers 304 Not Modified when the ETag still matches" do
        create(:property)

        get "/api/v1/properties"
        etag = response.headers["ETag"]
        expect(etag).to be_present
        expect(response.headers["Cache-Control"]).to eq("public, no-cache")

        queries = count_queries { get "/api/v1/properties", headers: { "If-None-Match" => etag } }
        expect(response).to have_http_status(:not_modified)
        expect(queries).to eq(0)
      end

      it "serves repeat searches from the cache" do
        create(:property)
        get "/api/v1/properties", params: { q: "richmond" }

        expect(count_queries { get "/api/v1/properties", params: { q: "richmond" } }).to eq(0)
        expect(json["data"].size).to eq(1)
      end

      it "invalidates cached results and ETags when a property changes" do
        property = create(:property, price: 1_000_000)
        get "/api/v1/properties"
        etag = response.headers["ETag"]

        property.update!(price: 900_000)
        get "/api/v1/properties", headers: { "If-None-Match" => etag }

        expect(response).to have_http_status(:ok)
        expect(json["data"].first["price"]).to eq(900_000)
      end
    end
  end

  describe "GET /api/v1/properties/:id" do
    it "returns the property with its description" do
      property = create(:property, description: "Bright and airy")
      get "/api/v1/properties/#{property.id}"

      expect(json["data"]).to include("id" => property.id, "description" => "Bright and airy")
    end

    it "returns 404 for unknown properties" do
      get "/api/v1/properties/0"

      expect(response).to have_http_status(:not_found)
      expect(json["error"]).to eq("code" => "not_found", "message" => "Property not found")
    end
  end

  describe "PATCH /api/v1/properties/:id" do
    let(:property) { create(:property, price: 1_000_000) }
    let(:admin) { create(:user, :admin) }

    it "lets admins change price/status and notifies watchers in real time" do
      watcher = create(:user)
      create(:watchlist_item, user: watcher, property:)

      expect {
        perform_enqueued_jobs do
          patch "/api/v1/properties/#{property.id}", params: { property: { price: 925_000, status: "under_offer" } }.to_json,
                                                     headers: json_headers(admin)
        end
      }.to have_broadcasted_to(WatchlistChannel.broadcasting_for_user(watcher.id)).with(
        hash_including("type" => "property.updated",
                       "changes" => { "price" => [ 1_000_000, 925_000 ], "status" => %w[active under_offer] })
      )

      expect(response).to have_http_status(:ok)
      expect(property.reload).to have_attributes(price: 925_000, status: "under_offer")
    end

    it "forbids regular users" do
      patch "/api/v1/properties/#{property.id}", params: { property: { price: 1 } }.to_json, headers: json_headers(create(:user))

      expect(response).to have_http_status(:forbidden)
      expect(property.reload.price).to eq(1_000_000)
    end

    it "requires authentication" do
      patch "/api/v1/properties/#{property.id}", params: { property: { price: 1 } }.to_json, headers: json_headers
      expect(response).to have_http_status(:unauthorized)
    end

    it "validates input" do
      patch "/api/v1/properties/#{property.id}", params: { property: { status: "demolished" } }.to_json, headers: json_headers(admin)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]["details"]).to have_key("status")
    end
  end
end
