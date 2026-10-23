// What the confirmation says before an election is deleted. It says plainly what the person will see change, and says
// more when voting is open or votes exist, because that is what they would regret.
export const deleteElectionMessage = (e: { status: 'upcoming' | 'live' | 'closed' }, votes: number) => {
  const base = 'The election and its nominations will be removed from your account.'
  if (votes > 0) return `It has ${votes.toLocaleString()} vote${votes === 1 ? '' : 's'}, and its results will no longer be shown. ${base}`
  if (e.status === 'live') return `Voting is open right now, so anyone paying while you delete it will lose their vote. ${base}`
  return base
}
