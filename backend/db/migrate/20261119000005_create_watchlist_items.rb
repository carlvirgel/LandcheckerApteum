class CreateWatchlistItems < ActiveRecord::Migration[8.1]
  def change
    create_table :watchlist_items do |t|
      # The unique (user_id, property_id) index below also serves user_id lookups,
      # so the single-column index from `references` is skipped.
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :property, null: false, foreign_key: { on_delete: :cascade }

      # Snapshot used to show "price dropped $X since you saved this"
      t.integer :price_at_save, null: false

      t.timestamps
    end

    add_index :watchlist_items, %i[user_id property_id], unique: true
    add_index :watchlist_items, %i[user_id created_at]
  end
end
