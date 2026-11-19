require "rails_helper"

RSpec.describe SavedSearch do
  let(:user) { create(:user) }

  it "keeps only known filter keys and drops blanks" do
    search = described_class.create!(user:, name: "Mine",
                                     filters: { q: "fitzroy", cursor: "abc", limit: 5, max_price: "", evil: "1" })

    expect(search.filters).to eq("q" => "fitzroy")
  end

  it "rejects filters that would not be a valid search" do
    search = described_class.new(user:, name: "Broken", filters: { min_price: 900_000, max_price: 100 })

    expect(search).not_to be_valid
    expect(search.errors[:filters]).to include("max_price must be greater than or equal to min_price")
  end

  it "requires a unique name per user" do
    create(:saved_search, user:, name: "Inner north")
    expect(build(:saved_search, user:, name: "Inner north")).not_to be_valid
    expect(build(:saved_search, name: "Inner north")).to be_valid
  end
end
