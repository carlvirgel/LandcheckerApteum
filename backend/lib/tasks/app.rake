namespace :demo do
  desc "Simulate market activity on watched properties. INTERVAL=seconds (default 5), COUNT=ticks (default forever)"
  task market: :environment do
    # Broadcast synchronously; this process may exit before an async job would run.
    ActiveJob::Base.queue_adapter = :inline

    interval = ENV.fetch("INTERVAL", 5).to_f
    remaining = ENV["COUNT"]&.to_i
    simulator = MarketSimulator.new

    puts "Simulating market activity every #{interval}s (Ctrl-C to stop)..."
    loop do
      property = Property.transaction { simulator.tick! }
      break puts("No available properties left.") unless property

      changes = property.saved_changes.slice(*Property::MARKET_ATTRIBUTES)
      puts "[#{Time.current.strftime('%H:%M:%S')}] ##{property.id} #{property.full_address}: " \
           "#{changes.map { |attr, (from, to)| "#{attr} #{from} -> #{to}" }.join(', ')}"

      break if remaining && (remaining -= 1) <= 0

      sleep interval
    end
  rescue Interrupt
    puts "\nStopped."
  end
end
