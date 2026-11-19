require "rails_helper"

RSpec.describe PropertySearch do
  def ids_for(params)
    described_class.new(params).results.records.map(&:id)
  end

  describe "filters" do
    let!(:cheap_apartment) { create(:property, property_type: "apartment", price: 450_000, bedrooms: 1, suburb: "Carlton", postcode: "3053") }
    let!(:family_house) { create(:property, property_type: "house", price: 1_400_000, bedrooms: 4, suburb: "Richmond") }
    let!(:townhouse) { create(:property, property_type: "townhouse", price: 900_000, bedrooms: 3, suburb: "Fitzroy", postcode: "3065") }
    let!(:sold_house) { create(:property, property_type: "house", price: 1_000_000, bedrooms: 3, status: "sold") }

    it "returns available listings only by default" do
      expect(ids_for({})).to contain_exactly(cheap_apartment.id, family_house.id, townhouse.id)
    end

    it "filters by status when asked" do
      expect(ids_for(status: "sold")).to eq([ sold_house.id ])
      expect(ids_for(status: %w[active sold]).size).to eq(4)
    end

    it "filters by an inclusive price range" do
      expect(ids_for(min_price: 900_000, max_price: 1_400_000)).to contain_exactly(family_house.id, townhouse.id)
      expect(ids_for(max_price: "450000")).to eq([ cheap_apartment.id ])
    end

    it "filters by bedrooms" do
      expect(ids_for(min_bedrooms: 3)).to contain_exactly(family_house.id, townhouse.id)
      expect(ids_for(min_bedrooms: 1, max_bedrooms: 1)).to eq([ cheap_apartment.id ])
    end

    it "filters by property type (comma separated or array)" do
      expect(ids_for(property_types: "apartment,townhouse")).to contain_exactly(cheap_apartment.id, townhouse.id)
      expect(ids_for(property_types: [ "house" ])).to eq([ family_house.id ])
    end

    it "matches partial, case-insensitive address terms" do
      expect(ids_for(q: "FITZ")).to eq([ townhouse.id ])
      expect(ids_for(q: "3053")).to eq([ cheap_apartment.id ])
      expect(ids_for(q: "richmond smith")).to eq([ family_house.id ])
    end

    it "treats LIKE wildcards in the query literally" do
      expect(ids_for(q: "%")).to be_empty
    end

    it "combines filters" do
      expect(ids_for(property_types: "house,townhouse", min_bedrooms: 3, max_price: 1_000_000)).to eq([ townhouse.id ])
    end

    it "reports the total only on the first page" do
      page = described_class.new(limit: 2).results
      expect(page.total_count).to eq(3)

      next_page = described_class.new(limit: 2, cursor: page.next_cursor).results
      expect(next_page.total_count).to be_nil
    end
  end

  describe "location search" do
    let!(:richmond) { create(:property, latitude: -37.8230, longitude: 144.9980) }
    let!(:cremorne) { create(:property, latitude: -37.8300, longitude: 144.9930) } # ~0.9km away
    let!(:geelong) { create(:property, latitude: -38.1490, longitude: 144.3610) }

    it "returns listings within the radius ordered by distance" do
      page = described_class.new(lat: -37.8231, lng: 144.9981, radius_km: 2).results

      expect(page.records.map(&:id)).to eq([ richmond.id, cremorne.id ])
      expect(page.records.first.distance_m).to be < 50
    end

    it "requires lat, lng and radius together" do
      search = described_class.new(lat: -37.8)
      expect(search).not_to be_valid
      expect(search.errors[:base]).to include("lat, lng and radius_km must be provided together")
    end
  end

  describe "keyset pagination" do
    before do
      # Duplicate prices, timestamps and locations make sure ties are broken by id.
      [ 500_000, 500_000, 600_000, 700_000, 700_000, 800_000, 900_000 ].each_with_index do |price, i|
        create(:property, price:, listed_at: Time.zone.parse("2026-11-01") - (i / 2).days,
                          latitude: -37.8230 - (i % 3) * 0.002)
      end
    end

    {
      "newest" => {},
      "price_asc" => {},
      "price_desc" => {},
      "distance" => { lat: -37.80, lng: 144.99, radius_km: 10 }
    }.each do |sort, extra|
      it "walks every row exactly once when sorting by #{sort}" do
        seen = []
        cursor = nil
        loop do
          page = described_class.new(sort:, limit: 3, cursor:, **extra).results
          seen.concat(page.records.map(&:id))
          cursor = page.next_cursor
          break unless cursor
        end

        expected = described_class.new(sort:, limit: 50, **extra).results.records.map(&:id)
        expect(seen).to eq(expected)
        expect(seen.uniq.size).to eq(7)
      end
    end

    it "orders by price with id as the tie breaker" do
      prices = described_class.new(sort: "price_asc").results.records.map(&:price)
      expect(prices).to eq(prices.sort)
    end

    it "rejects a cursor issued for a different sort" do
      cursor = described_class.new(sort: "newest", limit: 2).results.next_cursor
      search = described_class.new(sort: "price_asc", cursor:)

      expect(search).not_to be_valid
      expect(search.errors[:cursor]).to include("does not match the requested sort order")
    end

    it "rejects a tampered cursor" do
      expect(described_class.new(cursor: "not-base64!!")).not_to be_valid
      expect(described_class.new(cursor: Base64.urlsafe_encode64('{"s":"newest","v":"garbage","id":1}'))).not_to be_valid
    end
  end

  describe "validation" do
    it "explains every invalid parameter" do
      search = described_class.new(min_price: "lots", max_bedrooms: 99, property_types: "castle",
                                   sort: "random", limit: 500)

      expect(search).not_to be_valid
      expect(search.errors.to_hash.keys).to contain_exactly(:min_price, :max_bedrooms, :property_types, :sort, :limit)
    end

    it "rejects inverted ranges" do
      search = described_class.new(min_price: 2_000_000, max_price: 1_000_000, min_bedrooms: 4, max_bedrooms: 2)
      expect(search).not_to be_valid
      expect(search.errors.attribute_names).to contain_exactly(:max_price, :max_bedrooms)
    end

    it "produces the same cache key for equivalent searches" do
      a = described_class.new(q: "Richmond", property_types: "unit,house")
      b = described_class.new(q: "richmond", property_types: %w[house unit])
      expect(a.cache_key).to eq(b.cache_key)
    end
  end
end
