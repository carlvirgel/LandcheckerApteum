import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildProperty } from '@/test/fixtures'
import { PropertyCard } from './PropertyCard'
import { PropertyGrid } from './PropertyGrid'
import { PropertyMedia } from './PropertyMedia'

// Spy on a child component so we can prove memoisation skips unchanged cards
jest.mock('./PropertyMedia', () => ({ PropertyMedia: jest.fn() }))
const mediaRenders = jest.mocked(PropertyMedia)
const { PropertyMedia: RealPropertyMedia } = jest.requireActual<typeof import('./PropertyMedia')>('./PropertyMedia')

describe('PropertyCard', () => {
  beforeEach(() => mediaRenders.mockImplementation(RealPropertyMedia))

  it('shows the key listing details', () => {
    const property = buildProperty({ price: 1_250_000, street_address: '12 Swan St', bedrooms: 4, bathrooms: 2, car_spaces: 1 })
    render(<PropertyCard property={property} isWatched={false} onToggleWatch={jest.fn()} />)

    const card = screen.getByRole('article', { name: property.full_address })
    expect(card).toHaveTextContent('$1,250,000')
    expect(card).toHaveTextContent('12 Swan St')
    expect(card).toHaveTextContent('Richmond VIC 3121')
    expect(screen.getByTitle('Bedrooms')).toHaveTextContent('4')
    expect(card).toHaveTextContent('Northside Realty')
  })

  it('reports the current watch state when the heart is clicked', async () => {
    const onToggleWatch = jest.fn()
    const property = buildProperty({ street_address: '12 Swan St' })
    const { rerender } = render(<PropertyCard property={property} isWatched={false} onToggleWatch={onToggleWatch} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save 12 Swan St to watchlist' }))
    expect(onToggleWatch).toHaveBeenCalledWith(property, false)

    rerender(<PropertyCard property={property} isWatched onToggleWatch={onToggleWatch} />)
    const button = screen.getByRole('button', { name: 'Remove 12 Swan St from watchlist' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the price movement since the property was saved', () => {
    render(<PropertyCard property={buildProperty({ price: 950_000 })} priceAtSave={1_000_000} isWatched onToggleWatch={jest.fn()} />)
    expect(screen.getByText(/Down \$50,000 since you saved it/)).toBeInTheDocument()
  })

  it('flags sold listings', () => {
    render(<PropertyCard property={buildProperty({ status: 'sold' })} isWatched={false} onToggleWatch={jest.fn()} />)
    expect(screen.getByText('Sold')).toBeInTheDocument()
  })

  it('only re-renders the card whose props changed', () => {
    const onToggleWatch = jest.fn()
    const properties = [buildProperty(), buildProperty(), buildProperty()]
    const { rerender } = render(<PropertyGrid properties={properties} watchedIds={new Set()} onToggleWatch={onToggleWatch} />)
    expect(mediaRenders).toHaveBeenCalledTimes(3)

    mediaRenders.mockClear()
    // A live update replaces one property object; the user also watches another
    const updated = [properties[0], { ...properties[1], price: 1 }, properties[2]]
    rerender(<PropertyGrid properties={updated} watchedIds={new Set([properties[2].id])} onToggleWatch={onToggleWatch} />)

    expect(mediaRenders).toHaveBeenCalledTimes(2)
    expect(mediaRenders.mock.calls.map(([props]) => props.property.id)).toEqual([properties[1].id, properties[2].id])
  })
})
