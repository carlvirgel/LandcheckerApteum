FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    name { Faker::Name.name }
    password { "password123" }

    trait :admin do
      role { "admin" }
    end
  end

  factory :agency do
    sequence(:name) { |n| "Agency #{n}" }
    phone { "03 9555 0000" }
  end

  factory :property do
    agency
    title { "Renovated 3-bedroom house" }
    description { "A lovely home." }
    sequence(:street_address) { |n| "#{n} Smith St" }
    suburb { "Richmond" }
    state { "VIC" }
    postcode { "3121" }
    latitude { -37.8230 }
    longitude { 144.9980 }
    property_type { "house" }
    status { "active" }
    price { 1_000_000 }
    bedrooms { 3 }
    bathrooms { 2 }
    car_spaces { 1 }
    land_size_sqm { 400 }
    sequence(:listed_at) { |n| Time.zone.parse("2026-11-01 12:00") - n.minutes }
  end

  factory :watchlist_item do
    user
    property
  end

  factory :saved_search do
    user
    sequence(:name) { |n| "Search #{n}" }
    filters { { "q" => "richmond", "min_bedrooms" => 2 } }
  end
end
