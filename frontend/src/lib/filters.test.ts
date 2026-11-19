import { countActiveFilters, DEFAULT_FILTERS, parseFilters, savedFiltersToUrl, toApiParams, toUrlParams } from './filters'

const parse = (query: string) => parseFilters(new URLSearchParams(query))

describe('parseFilters', () => {
  it('returns defaults for an empty query', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS)
  })

  it('reads every supported filter', () => {
    expect(
      parse('q=richmond&min_price=500000&max_price=900000&min_bedrooms=2&max_bedrooms=4&property_types=house,unit&status=sold&sort=price_asc'),
    ).toEqual({
      ...DEFAULT_FILTERS,
      q: 'richmond',
      minPrice: 500_000,
      maxPrice: 900_000,
      minBedrooms: 2,
      maxBedrooms: 4,
      propertyTypes: ['house', 'unit'],
      status: 'sold',
      sort: 'price_asc',
    })
  })

  it('ignores invalid values instead of sending them to the API', () => {
    const filters = parse('min_price=abc&max_price=-5&min_bedrooms=99&property_types=castle,house&sort=random')
    expect(filters).toMatchObject({ minPrice: null, maxPrice: null, minBedrooms: null, propertyTypes: ['house'], sort: 'newest' })
  })

  it('swaps inverted ranges', () => {
    expect(parse('min_price=900000&max_price=500000')).toMatchObject({ minPrice: 500_000, maxPrice: 900_000 })
  })

  it('only allows distance sorting with a location', () => {
    expect(parse('sort=distance').sort).toBe('newest')
    const near = parse('lat=-37.8&lng=144.9&radius_km=2&near_label=Home')
    expect(near.near).toEqual({ lat: -37.8, lng: 144.9, radiusKm: 2, label: 'Home' })
    expect(near.sort).toBe('distance')
  })

  it('understands both URL and API forms of status', () => {
    expect(parse('status=all').status).toBe('all')
    expect(parse('status=active,under_offer,sold').status).toBe('all')
  })
})

describe('toApiParams / toUrlParams', () => {
  it('omits defaults so equivalent searches share a cache entry', () => {
    expect(toApiParams(DEFAULT_FILTERS)).toEqual({})
  })

  it('serialises filters for the API', () => {
    const filters = parse('q=%20fitzroy%20&property_types=unit,house&status=all&min_bedrooms=3')
    expect(toApiParams(filters)).toEqual({
      q: 'fitzroy',
      property_types: 'house,unit',
      status: 'active,under_offer,sold',
      min_bedrooms: '3',
    })
  })

  it('round-trips through the URL', () => {
    const query = 'q=kew&min_price=1000000&property_types=townhouse&status=all&lat=-37.8&lng=145&radius_km=5&near_label=12+Smith+St'
    const filters = parse(query)
    expect(parseFilters(toUrlParams(filters))).toEqual(filters)
  })
})

describe('countActiveFilters', () => {
  it('counts filter groups, not individual params', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0)
    expect(countActiveFilters(parse('min_price=1&max_price=2&property_types=house,unit'))).toBe(2)
  })
})

describe('savedFiltersToUrl', () => {
  it('turns stored API params back into a page query string', () => {
    const query = savedFiltersToUrl({ property_types: ['house', 'townhouse'], min_bedrooms: 3, status: 'active,under_offer,sold' })
    expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
      property_types: 'house,townhouse',
      min_bedrooms: '3',
      status: 'all',
    })
  })
})
