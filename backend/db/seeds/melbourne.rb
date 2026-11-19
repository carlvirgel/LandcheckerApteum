module Seeds
  module Melbourne
    # name => [postcode, latitude, longitude, price multiplier]
    SUBURBS = {
      "Melbourne" => [ "3000", -37.8136, 144.9631, 1.00 ],
      "Southbank" => [ "3006", -37.8250, 144.9640, 0.95 ],
      "Docklands" => [ "3008", -37.8160, 144.9460, 0.90 ],
      "Carlton" => [ "3053", -37.8000, 144.9670, 1.15 ],
      "Fitzroy" => [ "3065", -37.7980, 144.9780, 1.35 ],
      "Collingwood" => [ "3066", -37.8020, 144.9880, 1.20 ],
      "Richmond" => [ "3121", -37.8230, 144.9980, 1.30 ],
      "Brunswick" => [ "3056", -37.7670, 144.9620, 1.10 ],
      "Coburg" => [ "3058", -37.7440, 144.9660, 0.95 ],
      "Northcote" => [ "3070", -37.7700, 144.9990, 1.25 ],
      "Thornbury" => [ "3071", -37.7580, 145.0050, 1.10 ],
      "Preston" => [ "3072", -37.7430, 145.0130, 0.90 ],
      "Reservoir" => [ "3073", -37.7170, 145.0070, 0.80 ],
      "South Yarra" => [ "3141", -37.8380, 144.9920, 1.40 ],
      "Prahran" => [ "3181", -37.8510, 144.9930, 1.25 ],
      "St Kilda" => [ "3182", -37.8670, 144.9800, 1.15 ],
      "Elwood" => [ "3184", -37.8820, 144.9850, 1.35 ],
      "Brighton" => [ "3186", -37.9060, 145.0000, 2.10 ],
      "Albert Park" => [ "3206", -37.8410, 144.9550, 1.80 ],
      "Port Melbourne" => [ "3207", -37.8390, 144.9420, 1.40 ],
      "Hawthorn" => [ "3122", -37.8220, 145.0350, 1.70 ],
      "Kew" => [ "3101", -37.8060, 145.0310, 1.85 ],
      "Camberwell" => [ "3124", -37.8380, 145.0700, 1.80 ],
      "Malvern" => [ "3144", -37.8580, 145.0310, 1.90 ],
      "Caulfield" => [ "3162", -37.8770, 145.0230, 1.40 ],
      "Bentleigh" => [ "3204", -37.9180, 145.0350, 1.30 ],
      "Box Hill" => [ "3128", -37.8190, 145.1220, 1.10 ],
      "Doncaster" => [ "3108", -37.7880, 145.1250, 1.15 ],
      "Glen Waverley" => [ "3150", -37.8780, 145.1650, 1.25 ],
      "Footscray" => [ "3011", -37.8000, 144.9000, 0.85 ],
      "Yarraville" => [ "3013", -37.8160, 144.8900, 1.05 ],
      "Williamstown" => [ "3016", -37.8640, 144.8990, 1.30 ],
      "Essendon" => [ "3040", -37.7560, 144.9170, 1.20 ],
      "Sunshine" => [ "3020", -37.7880, 144.8330, 0.70 ],
      "Werribee" => [ "3030", -37.9000, 144.6600, 0.55 ],
      "Frankston" => [ "3199", -38.1440, 145.1260, 0.60 ]
    }.freeze

    STREETS = [
      "Smith St", "Chapel St", "Church St", "High St", "Victoria St", "Lygon St", "Sydney Rd", "Queens Pde",
      "Station St", "Albert St", "Park St", "King St", "Bridge Rd", "Swan St", "Gertrude St", "Brunswick St",
      "Nicholson St", "Rathdowne St", "Barkly St", "Glenferrie Rd", "Burke Rd", "Toorak Rd", "Punt Rd",
      "Johnston St", "Elgin St", "Acland St", "Grey St", "Ormond Rd", "Bay St", "Beach Rd", "Riversdale Rd",
      "Canterbury Rd", "Whitehorse Rd", "Ferguson St", "Nelson Pl", "Racecourse Rd", "Mount Alexander Rd",
      "Union Rd", "Rose St", "Napier St", "Wellington St", "Hope St", "Arthur St", "Clarke St", "Miller St",
      "Garden Ave", "Elm Gr", "Wattle Ct", "Banksia Cres", "Myrtle Way"
    ].freeze

    AGENCIES = {
      "Bayside Property Co." => "03 9555 0101",
      "Northside Realty" => "03 9555 0102",
      "Yarra Residential" => "03 9555 0103",
      "Westgate Estate Agents" => "03 9555 0104",
      "Eastern Ridge Real Estate" => "03 9555 0105",
      "Laneway Property" => "03 9555 0106",
      "Bluestone & Co." => "03 9555 0107",
      "Harbourline Realty" => "03 9555 0108",
      "Greenfield Partners" => "03 9555 0109",
      "Terrace House Agents" => "03 9555 0110",
      "Parkside Living" => "03 9555 0111",
      "Coastal Key Realty" => "03 9555 0112"
    }.freeze

    # type => [weight, bedroom range, base price for a 2-bed, price per extra bedroom]
    TYPES = {
      "house" => [ 40, 2..6, 850_000, 210_000 ],
      "apartment" => [ 25, 1..3, 480_000, 160_000 ],
      "townhouse" => [ 15, 2..4, 720_000, 170_000 ],
      "unit" => [ 12, 1..3, 430_000, 130_000 ],
      "villa" => [ 4, 2..4, 620_000, 140_000 ],
      "land" => [ 4, 0..0, 520_000, 0 ]
    }.freeze

    STATUSES = { "active" => 80, "under_offer" => 8, "sold" => 10, "withdrawn" => 2 }.freeze

    ADJECTIVES = [ "Light-filled", "Renovated", "Elegant", "Charming", "Contemporary", "Spacious", "Stylish",
                   "Period", "Architect-designed", "Low-maintenance", "Leafy", "North-facing" ].freeze

    module_function

    def property_attributes(rng, agency_ids:, now:)
      suburb, (postcode, lat, lng, multiplier) = SUBURBS.to_a.sample(random: rng)
      type = weighted(TYPES.transform_values(&:first), rng)
      _, bedroom_range, base_price, per_bedroom = TYPES.fetch(type)
      bedrooms = rng.rand(bedroom_range)

      raw_price = (base_price + [ bedrooms - 2, 0 ].max * per_bedroom) * multiplier * rng.rand(0.8..1.25)
      price = (raw_price / 5_000).round * 5_000
      number = rng.rand(1..250)
      street = "#{%w[apartment unit].include?(type) ? "#{rng.rand(1..40)}/" : ''}#{number} #{STREETS.sample(random: rng)}"

      {
        agency_id: agency_ids.sample(random: rng),
        title: title_for(type, bedrooms, rng),
        description: description_for(type, bedrooms, suburb),
        street_address: street,
        suburb:,
        state: "VIC",
        postcode:,
        latitude: (lat + rng.rand(-0.012..0.012)).round(6),
        longitude: (lng + rng.rand(-0.015..0.015)).round(6),
        property_type: type,
        status: weighted(STATUSES, rng),
        price:,
        bedrooms:,
        bathrooms: type == "land" ? 0 : [ 1, bedrooms - rng.rand(0..2) ].max,
        car_spaces: type == "land" ? 0 : rng.rand(0..[ bedrooms, 3 ].min),
        land_size_sqm: land_size_for(type, rng),
        image_url: nil,
        listed_at: now - rng.rand(0..(120 * 24 * 60)).minutes,
        created_at: now,
        updated_at: now
      }
    end

    def weighted(weights, rng)
      target = rng.rand(weights.values.sum)
      weights.each { |key, weight| return key if (target -= weight).negative? }
    end

    def title_for(type, bedrooms, rng)
      return "#{ADJECTIVES.sample(random: rng)} building block" if type == "land"

      "#{ADJECTIVES.sample(random: rng)} #{bedrooms}-bedroom #{type}"
    end

    def description_for(type, bedrooms, suburb)
      return "A rare opportunity to secure a vacant block in #{suburb}. Plans and permits available on request." if type == "land"

      "This #{bedrooms}-bedroom #{type} in the heart of #{suburb} offers generous living spaces, " \
        "a modern kitchen and easy access to transport, schools and cafes."
    end

    def land_size_for(type, rng)
      case type
      when "house" then rng.rand(250..850)
      when "townhouse", "villa" then rng.rand(120..320)
      when "land" then rng.rand(300..900)
      end
    end
  end
end
