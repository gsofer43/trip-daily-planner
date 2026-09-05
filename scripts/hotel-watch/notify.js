// Placeholder until round 4 wires up Resend.
//
// run.js imports this only when a hotel actually transitions to available. Keeping a real
// module here (rather than letting the import fail) means a transition during round 3 is
// reported loudly in the run log instead of crashing the whole run after the checks succeeded.
export async function sendAvailabilityAlerts(transitions) {
  console.log('\n!!  Email alerts are not wired up yet (round 4). Would have alerted for:');
  for (const t of transitions) {
    console.log(`    ${t.watch.hotelName}  ${t.watch.checkin} -> ${t.watch.checkout}`);
  }
}
