# Every error leaves the API in one envelope:
#   { "error": { "code": "validation_failed", "message": "...", "details": { "field": ["..."] } } }
module ErrorHandling
  extend ActiveSupport::Concern

  class Unauthorized < StandardError
    def initialize(message = "Authentication required") = super
  end

  class Forbidden < StandardError
    def initialize(message = "You are not allowed to perform this action") = super
  end

  class InvalidParams < StandardError
    attr_reader :details

    def initialize(errors)
      @details = errors.to_hash
      super(errors.full_messages.to_sentence)
    end
  end

  included do
    # Handlers are matched bottom-up, so the catch-all must be registered first.
    rescue_from StandardError, with: :render_internal_error

    rescue_from ActionController::ParameterMissing, ActionDispatch::Http::Parameters::ParseError do |error|
      render_error(status: :bad_request, code: "bad_request", message: error.message)
    end

    rescue_from ActiveRecord::RecordNotFound do |error|
      render_error(status: :not_found, code: "not_found", message: "#{error.model || 'Record'} not found")
    end

    rescue_from ActiveRecord::RecordInvalid do |error|
      render_error(status: :unprocessable_content, code: "validation_failed",
                   message: error.record.errors.full_messages.to_sentence, details: error.record.errors.to_hash)
    end

    rescue_from ActiveRecord::RecordNotUnique do
      render_error(status: :conflict, code: "conflict", message: "Resource already exists")
    end

    rescue_from InvalidParams do |error|
      render_error(status: :unprocessable_content, code: "invalid_params", message: error.message, details: error.details)
    end

    rescue_from Unauthorized do |error|
      render_error(status: :unauthorized, code: "unauthorized", message: error.message)
    end

    rescue_from Forbidden do |error|
      render_error(status: :forbidden, code: "forbidden", message: error.message)
    end
  end

  private

  def render_error(status:, code:, message:, details: nil)
    render json: { error: { code:, message:, details: }.compact }, status:
  end

  def render_internal_error(error)
    raise error if Rails.env.local? && ENV["RAISE_ERRORS"] == "true"

    Rails.error.report(error, handled: true)
    Rails.logger.error("#{error.class}: #{error.message}\n#{error.backtrace&.first(10)&.join("\n")}")

    message = Rails.env.production? ? "Something went wrong" : "#{error.class}: #{error.message}"
    render_error(status: :internal_server_error, code: "internal_error", message:)
  end
end
