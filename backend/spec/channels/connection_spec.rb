require "rails_helper"

RSpec.describe ApplicationCable::Connection, type: :channel do
  let(:user) { create(:user) }

  it "identifies the user from a valid token" do
    connect "/cable", params: { token: JsonWebToken.encode(user) }
    expect(connection.current_user).to eq(user)
  end

  it "rejects a missing token" do
    expect { connect "/cable" }.to have_rejected_connection
  end

  it "rejects an expired token" do
    token = JsonWebToken.encode(user, ttl: 1.minute)
    travel 5.minutes do
      expect { connect "/cable", params: { token: } }.to have_rejected_connection
    end
  end
end
