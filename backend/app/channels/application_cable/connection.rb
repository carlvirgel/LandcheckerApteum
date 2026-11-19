module ApplicationCable
  # Browsers can't set headers on a WebSocket handshake, so the JWT is passed as a
  # `token` query param (filtered from logs via filter_parameters).
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = JsonWebToken.user_from(request.params[:token]) || reject_unauthorized_connection
    end
  end
end
