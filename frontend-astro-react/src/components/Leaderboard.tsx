
type User = {
  id: string
  username: string
  socket: string
  energy: number
  points: number
  zombie: boolean
  lastTaggedBy: {
    id: string
    time: number
  }
}

export default function Leaderboard({ leaderboard }: {
  leaderboard: User[]
}) {
  return (
    <div className="prose">
      <h1 className="header">Leaderboard</h1>
      <table>
        <tr>
          <th>Username</th>
          <th>Points</th>
        </tr>
        {leaderboard.map((user, idx) => (
          <tr key={user.id}>
            <td>{user.username}</td>
            <td>{user.points}</td>
          </tr>
        ))}
      </table>
    </div>
  )
}