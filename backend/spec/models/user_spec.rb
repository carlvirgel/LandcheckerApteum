require "rails_helper"

RSpec.describe User do
  subject { build(:user) }

  it { is_expected.to have_many(:watchlist_items).dependent(:delete_all) }
  it { is_expected.to have_many(:watched_properties).through(:watchlist_items) }
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_length_of(:password).is_at_least(8) }

  it "normalises email and enforces case-insensitive uniqueness" do
    create(:user, email: "Jane@Example.com ")
    duplicate = build(:user, email: "jane@example.COM")

    expect(User.last.email).to eq("jane@example.com")
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:email]).to include("has already been taken")
  end

  it "rejects malformed email addresses" do
    expect(build(:user, email: "not-an-email")).not_to be_valid
  end

  it "defaults to the user role and rejects unknown roles" do
    expect(build(:user).role).to eq("user")
    expect(build(:user, role: "superuser")).not_to be_valid
  end
end
