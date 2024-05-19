import { useEffect, useState } from "react"
import { init_ggwave, init_receive, send } from "../lib/transceiver.ts";
import {initialRefresh, userId} from "../lib/stores.ts";
import { useStore} from "@nanostores/react";
import Progress from "./Progress.tsx";
import Leaderboard from "./Leaderboard.tsx";
import QRScanner from "./QRScanner.tsx";

import { io, Socket } from "socket.io-client";

const URL = "wss://xg40w.underpass.clb.li"

const place = (position: number) => {
  switch (position) {
    case 1:
      return "st"
    case 2:
      return "nd"
    default:
      return "th"
  }
}

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

      socket.on("error", props => {
        alert("error: " + props)
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

    if (id) {
      socket.emit("about", { id })
    }
    else {
      socket.emit("new")
    }

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

    socket.on("beacon", props => {
      setUser(props);
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
  const [qrTimeout, setQrTimeout] = useState(false)

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
      let index = leaderboard.findIndex((x: User) => x.id === user.id)
      setPosition(index + 1)
    }
  }, [leaderboard]);

  useEffect(() => {
    console.log("User updated", user)
  }, [user]);

  const init = () => {
    init_ggwave().then(() => {
      console.log("init_ggwave()")
      init_receive((id: string) => {
        // navigator.vibrate(200);
        console.log("audio works", userId.get())
        if (socket)
          socket.emit("tag", {
            taggee: userId.get(),
            tagger: id
          })
      })
      setInited(true)
    }).catch(err => console.log("Error loading init_ggwave", err))
  }

  if ($userId == "") return <Login setUsername={(username: string) => {
    init_socket(setSocket, setUser, setLeaderboard, username, undefined)
  }} init={() => {init();}}/>
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
        <h2>{Math.floor(user.points)} points - {position}{place(position)} place</h2>
        <p>Energy - {user.energy || 0}</p>
        <Progress percent={Math.max(user.energy * 10 / 12, 0)}/>
        <p>You are a {user.zombie ? "ZOMBIE" : "HUMAN"}</p>

        {user.zombie && <button className="button lg" onClick={async () => {
          send($userId!);
        }}>Tag!
        </button>}

        {/*<label className="button lg" htmlFor="beacon" style={{display: "block", width: "calc(100% - 1.2em)"}}>*/}
        {/*  Scan Beacon*/}
        {/*</label>*/}
        <h2>SCAN BEACON:</h2>
        <QRScanner
          fps={10}
          qrbox={250}
          disableFlip={false}
          disableFile={true}

          qrCodeSuccessCallback={(res: string)=>{
            if(!res.startsWith("bcn!")) return;
            socket!.emit("beacon", {
              id: $userId,
              code: res
            })
          }}
        />

        <Leaderboard leaderboard={leaderboard}/>

        <button className="button" style={{float: "right"}} onClick={() => {
          userId.set("")
          window.location.reload()
        }}
        >sign out
        </button>
      </div>
    )
}