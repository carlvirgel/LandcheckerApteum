# Bearer-token authentication. Endpoints are public unless they opt in with
# `before_action :require_authentication!`; an invalid token on a public endpoint
# is treated as anonymous rather than an error.
module Authentication
  extend ActiveSupport::Concern

  private

  def current_user
    return @current_user if defined?(@current_user)

    @current_user = JsonWebToken.user_from(bearer_token)
  end

  def bearer_token
    request.authorization.to_s[/\ABearer\s+(.+)\z/, 1]
  end

  def require_authentication!
    raise ErrorHandling::Unauthorized unless current_user
  end

  def require_admin!
    require_authentication!
    raise ErrorHandling::Forbidden unless current_user.admin?
  end
end
