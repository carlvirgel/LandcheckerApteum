require "rails_helper"

RSpec.describe "Saved searches API" do
  let(:user) { create(:user) }

  it "creates, lists and deletes the current user's saved searches" do
    post "/api/v1/saved_searches",
         params: { name: "Inner north", filters: { q: "brunswick", property_types: %w[house townhouse], min_bedrooms: 3 } }.to_json,
         headers: json_headers(user)

    expect(response).to have_http_status(:created)
    expect(json["data"]["filters"]).to eq("q" => "brunswick", "property_types" => %w[house townhouse], "min_bedrooms" => 3)
    id = json["data"]["id"]

    create(:saved_search) # someone else's
    get "/api/v1/saved_searches", headers: auth_headers(user)
    expect(json["data"].pluck("id")).to eq([ id ])

    delete "/api/v1/saved_searches/#{id}", headers: auth_headers(user)
    expect(response).to have_http_status(:no_content)
    expect(user.saved_searches).to be_empty
  end

  it "rejects invalid filters" do
    post "/api/v1/saved_searches", params: { name: "Bad", filters: { property_types: "castle" } }.to_json,
                                   headers: json_headers(user)

    expect(response).to have_http_status(:unprocessable_content)
    expect(json["error"]["details"]["filters"].first).to include("castle")
  end

  it "cannot delete another user's search" do
    other = create(:saved_search)
    delete "/api/v1/saved_searches/#{other.id}", headers: auth_headers(user)

    expect(response).to have_http_status(:not_found)
    expect(SavedSearch.exists?(other.id)).to be(true)
  end
end
