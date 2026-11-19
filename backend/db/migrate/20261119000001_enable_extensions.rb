class EnableExtensions < ActiveRecord::Migration[8.1]
  def change
    enable_extension "citext"        # case-insensitive unique emails
    enable_extension "pg_trgm"       # trigram index for partial address/suburb matching
    enable_extension "cube"          # required by earthdistance
    enable_extension "earthdistance" # index-backed radius search
  end
end
