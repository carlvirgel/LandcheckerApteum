class CreateSavedSearches < ActiveRecord::Migration[8.1]
  def change
    create_table :saved_searches do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.string :name, null: false
      t.jsonb :filters, null: false, default: {}

      t.timestamps
    end

    add_index :saved_searches, %i[user_id name], unique: true
  end
end
