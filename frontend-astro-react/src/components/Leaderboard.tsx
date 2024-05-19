
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
  console.log(leaderboard)

  return (
    <div className="prose">
      <h1 className="header" style={{ textAlign:"left"}}>Leaderboard</h1>
      <table>
        <tbody>
        <tr>
          <th>Place</th>
          <th>Username</th>
          <th>Points</th>
        </tr>
        {leaderboard.map((user, idx) => (
          <tr key={idx}>
            <td style={{ textAlign: "right" }}>{idx + 1}</td>
            <td>{user.username}</td>
            <td>{Math.floor(user.points) || 0}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  )
}