class CreateProperties < ActiveRecord::Migration[8.1]
  def change
    create_enum :property_type, %w[house apartment townhouse unit villa land]
    create_enum :listing_status, %w[active under_offer sold withdrawn]

    create_table :properties do |t|
      t.references :agency, null: false, foreign_key: true

      t.string :title, null: false
      t.text :description

      t.string :street_address, null: false
      t.string :suburb, null: false
      t.string :state, null: false, limit: 3
      t.string :postcode, null: false, limit: 4
      t.float :latitude, null: false
      t.float :longitude, null: false

      t.enum :property_type, enum_type: :property_type, null: false
      t.enum :status, enum_type: :listing_status, null: false, default: "active"

      t.integer :price, null: false # whole AUD
      t.integer :bedrooms, null: false, default: 0
      t.integer :bathrooms, null: false, default: 0
      t.integer :car_spaces, null: false, default: 0
      t.integer :land_size_sqm

      t.string :image_url
      t.datetime :listed_at, null: false

      # Lower-cased address text maintained by Postgres; backs the trigram index
      # so "richm" or "smith st" matches without a full table scan.
      t.virtual :search_text, type: :text, stored: true,
        as: "lower(street_address || ' ' || suburb || ' ' || state || ' ' || postcode)"

      t.timestamps
    end

    add_check_constraint :properties, "price > 0", name: "properties_price_positive"
    add_check_constraint :properties, "bedrooms >= 0 AND bathrooms >= 0 AND car_spaces >= 0",
      name: "properties_rooms_non_negative"
    add_check_constraint :properties, "latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180",
      name: "properties_coordinates_valid"

    # Keyset pagination for each sort order: ORDER BY <col>, id with WHERE (<col>, id) < (?, ?)
    add_index :properties, %i[listed_at id], order: { listed_at: :desc, id: :desc },
      name: "index_properties_on_listed_at_and_id"
    add_index :properties, %i[price id], name: "index_properties_on_price_and_id"

    # Most common filter combination: status + type, with a price range
    add_index :properties, %i[status property_type price],
      name: "index_properties_on_status_type_price"
    add_index :properties, :bedrooms

    add_index :properties, :search_text, using: :gin, opclass: :gin_trgm_ops,
      name: "index_properties_on_search_text_trgm"

    # Radius search: earth_box(...) @> ll_to_earth(lat, lng) uses this GiST index
    add_index :properties, "ll_to_earth(latitude, longitude)", using: :gist,
      name: "index_properties_on_earth_location"
  end
end
