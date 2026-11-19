# Issues and verifies the HS256 access tokens used by the SPA (Authorization header)
# and by ActionCable (token query param on the WebSocket handshake).
class JsonWebToken
  class DecodeError < StandardError; end

  ALGORITHM = "HS256".freeze
  TTL = 24.hours

  class << self
    def encode(user, ttl: TTL)
      now = Time.current.to_i
      payload = { sub: user.id.to_s, iat: now, exp: now + ttl.to_i, jti: SecureRandom.uuid }
      JWT.encode(payload, secret, ALGORITHM)
    end

    def decode(token)
      raise DecodeError, "Token missing" if token.blank?

      payload, = JWT.decode(token, secret, true, algorithm: ALGORITHM, required_claims: %w[sub exp])
      payload.with_indifferent_access
    rescue JWT::ExpiredSignature
      raise DecodeError, "Token expired"
    rescue JWT::DecodeError => e
      raise DecodeError, e.message
    end

    # Resolves a token to a user, returning nil for any invalid/expired/unknown token.
    def user_from(token)
      User.find_by(id: decode(token)[:sub])
    rescue DecodeError
      nil
    end

    private

    def secret
      ENV.fetch("JWT_SECRET") { Rails.application.secret_key_base }
    end
  end
end
