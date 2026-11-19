class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_enum :user_role, %w[user admin]

    create_table :users do |t|
      t.citext :email, null: false
      t.string :name, null: false
      t.string :password_digest, null: false
      t.enum :role, enum_type: :user_role, null: false, default: "user"

      t.timestamps
    end

    add_index :users, :email, unique: true
  end
end
