require "rails_helper"

RSpec.describe Property do
  subject(:property) { build(:property) }

  describe "validations" do
    it { is_expected.to belong_to(:agency) }
    it { is_expected.to validate_presence_of(:street_address) }
    it { is_expected.to validate_numericality_of(:price).only_integer.is_greater_than(0) }
    it { is_expected.to validate_numericality_of(:bedrooms).only_integer.is_greater_than_or_equal_to(0) }

    it "requires a 4 digit postcode" do
      property.postcode = "31A"
      expect(property).not_to be_valid
    end

    it "rejects unknown property types and statuses instead of raising" do
      property.property_type = "castle"
      property.status = "demolished"

      expect(property).not_to be_valid
      expect(property.errors.attribute_names).to include(:property_type, :status)
    end

    it "is also protected by database constraints" do
      property.save!
      expect { property.update_columns(price: -1) }.to raise_error(ActiveRecord::StatementInvalid, /price_positive/)
    end
  end

  it "keeps search_text in sync for trigram search" do
    property = create(:property, street_address: "12 Swan St", suburb: "Richmond", postcode: "3121")
    expect(property.reload.search_text).to eq("12 swan st richmond vic 3121")
  end

  describe "real-time change notifications" do
    let!(:property) { create(:property, price: 900_000) }

    it "enqueues a broadcast when the price changes" do
      expect { property.update!(price: 850_000) }
        .to have_enqueued_job(PropertyChangeBroadcastJob).with(property.id, { "price" => [ 900_000, 850_000 ] })
    end

    it "enqueues a broadcast when the status changes" do
      expect { property.update!(status: "sold") }
        .to have_enqueued_job(PropertyChangeBroadcastJob).with(property.id, { "status" => %w[active sold] })
    end

    it "does not broadcast changes watchers don't care about" do
      expect { property.update!(title: "New title") }.not_to have_enqueued_job(PropertyChangeBroadcastJob)
    end
  end

  describe ".search_cache_version", :caching do
    it "changes whenever a property is written" do
      property = create(:property)
      version = Property.search_cache_version

      property.update!(price: property.price + 5_000)

      expect(Property.search_cache_version).not_to eq(version)
    end
  end
end
