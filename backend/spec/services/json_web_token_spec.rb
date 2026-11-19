require "rails_helper"

RSpec.describe JsonWebToken do
  let(:user) { create(:user) }

  it "round-trips a user id" do
    token = described_class.encode(user)
    expect(described_class.decode(token)[:sub]).to eq(user.id.to_s)
    expect(described_class.user_from(token)).to eq(user)
  end

  it "rejects expired tokens" do
    token = described_class.encode(user, ttl: 1.minute)

    travel 2.minutes do
      expect { described_class.decode(token) }.to raise_error(described_class::DecodeError, "Token expired")
      expect(described_class.user_from(token)).to be_nil
    end
  end

  it "rejects tokens signed with another secret" do
    forged = JWT.encode({ sub: user.id.to_s, exp: 1.hour.from_now.to_i }, "not-the-secret", "HS256")
    expect(described_class.user_from(forged)).to be_nil
  end

  it "rejects the 'none' algorithm" do
    unsigned = JWT.encode({ sub: user.id.to_s, exp: 1.hour.from_now.to_i }, nil, "none")
    expect(described_class.user_from(unsigned)).to be_nil
  end

  it "returns nil for blank or garbage tokens" do
    expect(described_class.user_from(nil)).to be_nil
    expect(described_class.user_from("abc.def.ghi")).to be_nil
  end
end
