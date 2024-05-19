export default function Progress({ percent }: { percent: number }) {
  return (
    <div className="range">
      <div className="range" style={{ backgroundColor: !percent ? "red" : "green", width: !percent ? "100%" : `${percent}%` }}></div>
    </div>
  )
}