module RequestHelpers
  def json
    JSON.parse(response.body)
  end

  def auth_headers(user)
    { "Authorization" => "Bearer #{JsonWebToken.encode(user)}" }
  end

  def json_headers(user = nil)
    headers = { "Content-Type" => "application/json", "Accept" => "application/json" }
    user ? headers.merge(auth_headers(user)) : headers
  end
end
