const { TestEnvironment } = require('jest-environment-jsdom')

/**
 * jsdom doesn't implement the Fetch API, which react-router's data router uses
 * for every navigation (`new Request(...)`). Expose Node's implementations, plus
 * Node's AbortController so signals are accepted by Node's Request.
 */
class JsdomWithFetchEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context)
    Object.assign(this.global, {
      fetch,
      Request,
      Response,
      Headers,
      ReadableStream,
      TextEncoder,
      TextDecoder,
      AbortController,
      AbortSignal,
    })
  }
}

module.exports = JsdomWithFetchEnvironment
