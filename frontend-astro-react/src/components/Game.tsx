import { useEffect, useState } from "react"
import { init_ggwave, init_receive, send } from "../lib/transceiver.ts";
import { userId } from "../lib/stores.ts";
import { useStore} from "@nanostores/react";
import "./Game.css"
import Progress from "./Progress.tsx";
import Leaderboard from "./Leaderboard.tsx";
import { io, Socket } from "socket.io-client";
import QrcodeDecoder from "qrcode-decoder";

const URL = "wss://gin8x.underpass.clb.li"

function Login({ setUsername, init }: { setUsername: (id: string) => void, init: () => void }) {
  const [currentUsername, setCurrentUsername] = useState("")

  return (
    <div>
      <h2 className="header">Choose a username!</h2>
      <div className="form prose">
        <input autoComplete="off" placeholder={"Orpheus"} className="input" type={"text"} value={currentUsername}
               onChange={e => setCurrentUsername(e.target.value)}></input>
        <button className="button" onClick={() => {
          if (currentUsername.length < 1) return alert("What's your name?")
          setUsername(currentUsername)
          init()
        }}>Let's survive the apocalypse!
        </button>
      </div>
    </div>
  )
}

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

async function init_socket(
  setSocket: (socket: Socket) => void,
  setUser: (user: User) => void,
  setLeaderboard: (leaderboard: User[]) => void,
  username?: string,
  id?: string
) {
  const socket = io(URL)
  setSocket(socket)

  if (socket) {
    socket.on("connect", () => {
      socket.on("about", props => {
        setUser(JSON.parse(props))
      })

      socket.on("leaderboard", props => {
        setLeaderboard((JSON.parse(props)))
      })

      socket.on("id", props => {
        props = JSON.parse(props)
        if (!id) {
          userId.set(props.id)
          id = props.id
          socket.emit("username", {
            ...props,
            username
          })
          socket.emit("leaderboard")
        }

        socket.emit("about", { id })
      })
    })

    if (id) socket.emit("about", { id })
    else socket.emit("new")

    let lastTimestamp = Date.now()
    let timeout: NodeJS.Timeout
    async function postHeartbeat() {
      timeout = setTimeout(() => {
        let curr = Date.now()
        let elapsed = curr - lastTimestamp

        socket.emit("heartbeat", { id, elapsed })
        socket.emit("leaderboard")

        lastTimestamp = curr

        postHeartbeat()
      }, 1000)
    }
    postHeartbeat()

    socket.on("tag", props => {
      props = JSON.parse(props)
      setUser(props.me)
    })


    socket.on("disconnect", () => {
      if (timeout) clearTimeout(timeout)
    })

    window.addEventListener("beforeunload", () => {
      if (timeout) clearTimeout(timeout)
    })
  }
}

export default function Game() {
  const $userId = useStore(userId)

  const [socket, setSocket] = useState<Socket | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [position, setPosition] = useState<number>(0)
  const [leaderboard, setLeaderboard] = useState<User[]>([])

  const [receivedIds, setReceivedIds] = useState<number[]>([])

  const [inited, setInited] = useState<boolean>(false)

  useEffect(() => {
    if ($userId) init_socket(setSocket, setUser, setLeaderboard, undefined, $userId)
  }, [])

  useEffect(() => {
    if (socket)
      socket.emit("leaderboard")
  }, [socket]);

  useEffect(() => {
    // Update position when leaderboard changes
    if (user) {
      console.log("Leaderboard", leaderboard)
      let index = leaderboard.findIndex((x: User) => x.username === user.username)
      setPosition(index + 1)
    }
  }, [leaderboard]);

  useEffect(() => {
    console.log("User updated", user)
  }, [user]);

  const init = () => {
    init_ggwave().then(() => {
      init_receive((id: string) => {
        navigator.vibrate(200);
        if (socket)
          socket.emit("tag", {
            taggee: $userId,
            tagger: id
          })
      })
      setInited(true)
    })
  }

  if ($userId == "") return <Login setUsername={(username: string) => {
    init_socket(setSocket, setUser, setLeaderboard, username, undefined)
  }} init={init}/>
  else if (!inited || !user)
    return (
      <div className="container">
        <button className="button lg" onClick={init}>
          Start Game
        </button>
        <button style={{ marginTop: 0 }} className="button lg" onClick={() => {
          userId.set("")
        }}
        >sign out</button>
      </div>
    )
  else
    return (
      <div>
        <h2>{Math.floor(user.points)} points - {position}{position === 1 ? "st" : "th"} place</h2>
        <p>Energy - {user.energy || 0}</p>
        <Progress percent={Math.max(user.energy * 10/12, 0)}/>
        <p>You are a {user.zombie ? "ZOMBIE" : "HUMAN"}</p>

        <button className="button lg" onClick={async () => {
          send($userId!);
        }}>Tag!
        </button>

        <label className="button lg" htmlFor="beacon" style={{display: "block", width: "calc(100% - 1.2em)"}}>
          Scan Beacon
        </label>
        <input onChange={event => {
          const barcode = event.target.files![0]
          const reader = new FileReader()
          reader.onload = async event => {
            console.log("Barcode", event)
            const qr = new QrcodeDecoder()
            // @ts-expect-error
            const result = await qr.decodeFromImage(event.target.result)
            const data = result.data
            // TODO: Regenerate data
            let valid = true
            if (valid && socket) {
              // Give points
              socket.emit("beacon", {
                ...user
              })
            }
          }
          reader.readAsDataURL(barcode)
          // @ts-expect-error
        }} id="beacon" type="file" accept="image/*" capture="camera"/>

        <Leaderboard leaderboard={leaderboard}/>

        <button className="button" style={{ float: "right"}} onClick={() => {
          userId.set("")
        }}
        >sign out
        </button>
      </div>
    )
}