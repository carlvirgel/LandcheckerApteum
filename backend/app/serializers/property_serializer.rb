# Property JSON is deliberately user-independent (no "is watched" flag) so search
# pages can be cached once and shared by every user; watch state lives client-side.
class PropertySerializer
  def self.collection(records, **options)
    records.map { |record| new(record, **options).as_json }
  end

  def initialize(property, detail: false)
    @property = property
    @detail = detail
  end

  def as_json(*)
    json = {
      id: property.id,
      title: property.title,
      street_address: property.street_address,
      suburb: property.suburb,
      state: property.state,
      postcode: property.postcode,
      full_address: property.full_address,
      latitude: property.latitude,
      longitude: property.longitude,
      property_type: property.property_type,
      status: property.status,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      car_spaces: property.car_spaces,
      land_size_sqm: property.land_size_sqm,
      image_url: property.image_url,
      listed_at: property.listed_at.iso8601,
      updated_at: property.updated_at.iso8601(3),
      agency: { id: property.agency.id, name: property.agency.name, phone: property.agency.phone }
    }
    json[:distance_km] = (property.distance_m / 1000.0).round(2) if property.has_attribute?(:distance_m)
    json[:description] = property.description if @detail
    json
  end

  private

  attr_reader :property
end
