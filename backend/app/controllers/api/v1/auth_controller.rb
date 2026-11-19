module Api
  module V1
    class AuthController < ApplicationController
      # Tight per-IP limit on credential endpoints to slow down brute forcing
      throttle name: "auth", to: ENV.fetch("AUTH_RATE_LIMIT", 10).to_i, within: 3.minutes,
               by: -> { request.remote_ip }, only: %i[signup login]

      before_action :require_authentication!, only: :me

      # POST /api/v1/auth/signup  { name, email, password }
      def signup
        user = User.create!(params.permit(:name, :email, :password))
        render json: session_payload(user), status: :created
      end

      # POST /api/v1/auth/login  { email, password }
      def login
        # authenticate_by runs bcrypt even for unknown emails (no user-enumeration timing leak)
        user = User.authenticate_by(email: params.require(:email), password: params.require(:password))
        raise ErrorHandling::Unauthorized, "Invalid email or password" unless user

        render json: session_payload(user)
      end

      # GET /api/v1/auth/me
      def me
        render json: { user: UserSerializer.new(current_user).as_json }
      end

      private

      def session_payload(user)
        { token: JsonWebToken.encode(user), user: UserSerializer.new(user).as_json }
      end
    end
  end
end
