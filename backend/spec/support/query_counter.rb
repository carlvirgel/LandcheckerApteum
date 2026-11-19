# Counts the SQL statements executed by a block (ignoring schema and transaction noise).
# Used to prove endpoints don't issue N+1 queries.
module QueryCounter
  IGNORED = /\A\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE SAVEPOINT)/i

  def count_queries(&block)
    count = 0
    counter = lambda do |*, payload|
      next if payload[:name] == "SCHEMA" || payload[:cached] || payload[:sql].match?(IGNORED)

      count += 1
    end
    ActiveSupport::Notifications.subscribed(counter, "sql.active_record", &block)
    count
  end
end
