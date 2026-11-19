import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeywordInput } from './KeywordInput'

describe('KeywordInput', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const setup = (value = '') => {
    const onChange = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const utils = render(<KeywordInput value={value} onChange={onChange} debounceMs={300} />)
    return { ...utils, onChange, user, input: screen.getByRole('searchbox') }
  }

  it('commits once the user stops typing', async () => {
    const { input, user, onChange } = setup()

    await user.type(input, 'rich')
    expect(onChange).not.toHaveBeenCalled()

    act(() => jest.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('rich')
  })

  it('commits immediately on Enter', async () => {
    const { input, user, onChange } = setup()
    await user.type(input, 'kew{Enter}')
    expect(onChange).toHaveBeenCalledWith('kew')
  })

  it('adopts external changes without echoing them back', () => {
    const { rerender, onChange, input } = setup('fitzroy')
    rerender(<KeywordInput value="" onChange={onChange} debounceMs={300} />)
    act(() => jest.advanceTimersByTime(1000))

    expect(input).toHaveValue('')
    expect(onChange).not.toHaveBeenCalled()
  })
})
