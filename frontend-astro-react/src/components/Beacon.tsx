import {useState} from "react";
import {useStore} from "@nanostores/react";
import {beaconId} from "../lib/stores.ts";
import {io, Socket} from "socket.io-client";

const URL = "ws://localhost:3000"

function Setup({setID}: {setID: (id: string) => void}) {
  const [currentID, setCurrentID] = useState("")
  const [loggedIn, setLoggedIn] = useState();

  return <div>
    <h1 className="header">Enter beacon ID:</h1>
    <div className="form prose">
      <input autoComplete="off" placeholder={"Outpost"} className="input" type={"text"} value={currentID} onChange={e => setCurrentID(e.target.value)}></input>
      <button className="button" onClick={() => {
        setID(currentID)
      }}>do the beacony thing</button>
    </div>
  </div>
}

/*function init_socket(
  setSocket: (socket: Socket) => void,
  beaconID: string) {

  const socket = io(URL)
  setSocket(socket)

  socket!.on("connect", () => {

    socket.on('newQR', props => {
      setUser(props)
    })

    socket?.on("id", props => {
      if (!id) {
        userId.set(props.id)
        id = props.id
        socket?.emit('username', {
          ...props,
          username
        })
      }

      socket?.emit('create', {
        beaconID
      })
    })
  })
}*/

export default function Beacon() {
  const $beaconId = useStore(beaconId);

  return <Setup setID={(name) => {}}></Setup>
}
