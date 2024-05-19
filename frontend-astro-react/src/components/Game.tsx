import {useEffect, useState} from "react";
import {init_ggwave, init_receive, send} from "../lib/transceiver.ts";
import {userId} from "../lib/stores.ts";
import {useStore} from '@nanostores/react'
import "./Game.css"

import {io, Socket} from "socket.io-client"

const URL = "ws://localhost:3000"

function Login({setUsername, init}: {setUsername: (id: string) => void, init: () => void}) {
  const [currentUsername, setCurrentUsername] = useState("")
  const [loggedIn, setLoggedIn] = useState();

  return <div>
    <h2 className="header">Choose a username!</h2>
    <div className="form prose">
      <input autoComplete="off" placeholder={"Orpheus"} className="input" type={"text"} value={currentUsername} onChange={e => setCurrentUsername(e.target.value)}></input>
      <button className="button" onClick={() => {
        setUsername(currentUsername)
        init()
      }}>Let's survive the apocalypse!</button>
    </div>
  </div>
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

// side effect: sets id
function init_socket(
  setSocket: (socket: Socket) => void,
  setUser: (user: User) => void,
  username?: string, id?: string) {

  const socket = io(URL)
  setSocket(socket)

  socket!.on("connect", () => {

    socket.on('about', props => {
      setUser(props)
    })

    socket?.on("id", props => {
      props = JSON.parse(props)
      if (!id) {
        userId.set(props.id)
        id = props.id
        socket?.emit('username', {
          ...props,
          username
        })
      }

      socket?.emit('about', {
        id
      })
    })
  })
}

export default function Game() {
  const $userId = useStore(userId)

  const [socket, setSocket] = useState<Socket | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const [recievedIds, setRecievedIds] = useState<number[]>([])

  const [inited, setInited] = useState(false)

  useEffect(() => {
    console.log($userId)
    if ($userId)
      init_socket(setSocket, setUser, undefined, $userId)
    }, []);

  const init = () => {
    init_ggwave().then(() => {
      init_receive((id: number) => {
        setRecievedIds(recievedIds => [...recievedIds, id])
      })
      setInited(true)
  })
  }

  if ($userId == "") return <Login setUsername={(username: string) => {
    init_socket(setSocket, setUser, username, undefined)
  }} init={init}/>
    else if (!inited)
      return <div>
        <button onClick={init}>
          Start Game
        </button>
      </div>
      else return <div>
    {/*<div>
      <h1>ids received:</h1>
      {recievedIds.map((id) => {
        return <p>{id}</p>
      })}
    </div>*/}
    <button onClick={async () => {
      send($userId!);
    }}>Tag!</button>

      <button>
        Scan Beacon
      </button>

    <button onClick={() => {
      userId.set("")
    }}>
      Log Out
    </button> {/* TODO: remove lol */}
  </div>
}