# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_19_000006) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "citext"
  enable_extension "cube"
  enable_extension "earthdistance"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  # Custom types defined in this database.
  # Note that some types may not work with other database engines. Be careful if changing database.
  create_enum "listing_status", ["active", "under_offer", "sold", "withdrawn"]
  create_enum "property_type", ["house", "apartment", "townhouse", "unit", "villa", "land"]
  create_enum "user_role", ["user", "admin"]

  create_table "agencies", force: :cascade do |t|
    t.string "name", null: false
    t.string "phone"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_agencies_on_name", unique: true
  end

  create_table "properties", force: :cascade do |t|
    t.bigint "agency_id", null: false
    t.string "title", null: false
    t.text "description"
    t.string "street_address", null: false
    t.string "suburb", null: false
    t.string "state", limit: 3, null: false
    t.string "postcode", limit: 4, null: false
    t.float "latitude", null: false
    t.float "longitude", null: false
    t.enum "property_type", null: false, enum_type: "property_type"
    t.enum "status", default: "active", null: false, enum_type: "listing_status"
    t.integer "price", null: false
    t.integer "bedrooms", default: 0, null: false
    t.integer "bathrooms", default: 0, null: false
    t.integer "car_spaces", default: 0, null: false
    t.integer "land_size_sqm"
    t.string "image_url"
    t.datetime "listed_at", null: false
    t.virtual "search_text", type: :text, as: "lower((((((((street_address)::text || ' '::text) || (suburb)::text) || ' '::text) || (state)::text) || ' '::text) || (postcode)::text))", stored: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "ll_to_earth(latitude, longitude)", name: "index_properties_on_earth_location", using: :gist
    t.index ["agency_id"], name: "index_properties_on_agency_id"
    t.index ["bedrooms"], name: "index_properties_on_bedrooms"
    t.index ["listed_at", "id"], name: "index_properties_on_listed_at_and_id", order: :desc
    t.index ["price", "id"], name: "index_properties_on_price_and_id"
    t.index ["search_text"], name: "index_properties_on_search_text_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["status", "property_type", "price"], name: "index_properties_on_status_type_price"
    t.check_constraint "bedrooms >= 0 AND bathrooms >= 0 AND car_spaces >= 0", name: "properties_rooms_non_negative"
    t.check_constraint "latitude >= '-90'::integer::double precision AND latitude <= 90::double precision AND longitude >= '-180'::integer::double precision AND longitude <= 180::double precision", name: "properties_coordinates_valid"
    t.check_constraint "price > 0", name: "properties_price_positive"
  end

  create_table "saved_searches", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.jsonb "filters", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "name"], name: "index_saved_searches_on_user_id_and_name", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.citext "email", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.enum "role", default: "user", null: false, enum_type: "user_role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  create_table "watchlist_items", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "property_id", null: false
    t.integer "price_at_save", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id"], name: "index_watchlist_items_on_property_id"
    t.index ["user_id", "created_at"], name: "index_watchlist_items_on_user_id_and_created_at"
    t.index ["user_id", "property_id"], name: "index_watchlist_items_on_user_id_and_property_id", unique: true
  end

  add_foreign_key "properties", "agencies"
  add_foreign_key "saved_searches", "users", on_delete: :cascade
  add_foreign_key "watchlist_items", "properties", on_delete: :cascade
  add_foreign_key "watchlist_items", "users", on_delete: :cascade
end
