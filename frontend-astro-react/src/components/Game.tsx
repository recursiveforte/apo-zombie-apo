import {useEffect, useState} from "react";
import {init_ggwave, init_receive, send} from "../lib/transceiver.ts";
import {userId} from "../lib/stores.ts";
import {useStore} from '@nanostores/react'
import "./Game.css"

import {io, Socket} from "socket.io-client"

const URL = "ws://localhost"

function Login({setUserId}: {setUserId: (id: string) => void}) {
  const [currentId, setCurrentId] = useState("")

  return <div>
    <h1>sign in!</h1>
    <input type={"text"} value={currentId} onChange={e => setCurrentId(e.target.value)}></input>
    <button onClick={() => {
      setUserId(currentId) // TODO: socketio stuff
    }}>submit</button>
  </div>
}

export default function Game() {
  const $userId = useStore(userId)

  const [socket, setSocket] = useState<Socket | null>(null)

  const [recievedIds, setRecievedIds] = useState<number[]>([])

  useEffect(() => {

  }, []);


  if ($userId == "") return <Login setUserId={userId.set}/>
    else return <div>

  </div>


      /*return <div>
    <div>
      <h1>ids received:</h1>
      {recievedIds.map((id) => {
        return <p>{id}</p>
      })}
    </div>
    <button onClick={async () => {
      send($userId!);
    }}>Tag!</button>
    <button onClick={() => {
      init_ggwave().then(() =>
        init_receive((id: number) => {
          setRecievedIds(recievedIds => [...recievedIds, id])
        }))
    }}>Start</button>

    <button onClick={() => {
      userId.set("")
    }}>
      Reset Id
    </button>
  </div>*/
}