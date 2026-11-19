class CreateAgencies < ActiveRecord::Migration[8.1]
  def change
    create_table :agencies do |t|
      t.string :name, null: false
      t.string :phone

      t.timestamps
    end

    add_index :agencies, :name, unique: true
  end
end
