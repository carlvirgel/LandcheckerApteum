require "rails_helper"

RSpec.describe "Auth API" do
  describe "POST /api/v1/auth/signup" do
    it "creates a user and returns a token" do
      expect {
        post "/api/v1/auth/signup", params: { name: "Jane", email: "jane@example.com", password: "password123" }.to_json,
                                    headers: json_headers
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json["user"]).to include("email" => "jane@example.com", "name" => "Jane", "role" => "user")
      expect(JsonWebToken.user_from(json["token"])).to eq(User.last)
    end

    it "never lets a client choose its role" do
      post "/api/v1/auth/signup", params: { name: "Eve", email: "eve@example.com", password: "password123", role: "admin" }.to_json,
                                  headers: json_headers

      expect(User.last.role).to eq("user")
    end

    it "returns field errors for invalid input" do
      create(:user, email: "taken@example.com")
      post "/api/v1/auth/signup", params: { name: "", email: "TAKEN@example.com", password: "short" }.to_json,
                                  headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "code")).to eq("validation_failed")
      expect(json.dig("error", "details").keys).to contain_exactly("name", "email", "password")
    end
  end

  describe "POST /api/v1/auth/login" do
    let!(:user) { create(:user, email: "jane@example.com", password: "password123") }

    it "returns a token for valid credentials (email is case-insensitive)" do
      post "/api/v1/auth/login", params: { email: "Jane@Example.com", password: "password123" }.to_json, headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(JsonWebToken.user_from(json["token"])).to eq(user)
    end

    it "uses the same error for a wrong password and an unknown email" do
      post "/api/v1/auth/login", params: { email: "jane@example.com", password: "wrong" }.to_json, headers: json_headers
      wrong_password = [ response.status, json ]

      post "/api/v1/auth/login", params: { email: "nobody@example.com", password: "wrong" }.to_json, headers: json_headers

      expect(wrong_password.first).to eq(401)
      expect([ response.status, json ]).to eq(wrong_password)
    end

    it "returns 400 when a credential is missing" do
      post "/api/v1/auth/login", params: { email: "jane@example.com" }.to_json, headers: json_headers
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 400 for malformed JSON" do
      post "/api/v1/auth/login", params: "{not json", headers: json_headers
      expect(response).to have_http_status(:bad_request)
    end

    it "is rate limited per IP", :caching do
      10.times { post "/api/v1/auth/login", params: { email: "jane@example.com", password: "x" }.to_json, headers: json_headers }
      expect(response).to have_http_status(:unauthorized)

      post "/api/v1/auth/login", params: { email: "jane@example.com", password: "password123" }.to_json, headers: json_headers

      expect(response).to have_http_status(:too_many_requests)
      expect(response.headers["Retry-After"]).to eq("180")
      expect(json.dig("error", "code")).to eq("rate_limited")
    end
  end

  describe "GET /api/v1/auth/me" do
    let(:user) { create(:user) }

    it "returns the current user" do
      get "/api/v1/auth/me", headers: auth_headers(user)
      expect(json["user"]["id"]).to eq(user.id)
    end

    it "rejects missing or expired tokens" do
      get "/api/v1/auth/me"
      expect(response).to have_http_status(:unauthorized)

      token = JsonWebToken.encode(user, ttl: 1.minute)
      travel 2.minutes do
        get "/api/v1/auth/me", headers: { "Authorization" => "Bearer #{token}" }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
