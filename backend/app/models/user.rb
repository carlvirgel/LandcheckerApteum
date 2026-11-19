class User < ApplicationRecord
  has_secure_password

  enum :role, { user: "user", admin: "admin" }, default: "user", validate: true

  has_many :watchlist_items, dependent: :delete_all
  has_many :watched_properties, through: :watchlist_items, source: :property
  has_many :saved_searches, dependent: :delete_all

  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :name, with: ->(name) { name.squish }

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP },
                    length: { maximum: 254 }
  validates :name, presence: true, length: { maximum: 100 }
  validates :password, length: { minimum: 8 }, allow_nil: true
end
