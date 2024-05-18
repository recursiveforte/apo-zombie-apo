import { io } from 'socket.io-client'
import fs from 'fs'

const socket = io('ws://localhost:3000')

socket.on('connect', () => {
  let id: string

  socket.on(socket.id, props => {
    const storage = fs.readFileSync('localStorage.txt', 'utf-8')
    if (storage.length) id = storage
    if (!id) {
      // If not already "logged in", store in localStorage or something
      props = JSON.parse(props)
      id = props.id
      fs.writeFileSync('localStorage.txt', id)
      socket.emit('username', {
        ...props,
        username: 'jc'
      })
    } else {
      console.log('ID found', id)
    }
  })

  socket.on('username', props => {
    console.log('Updated username', id, JSON.parse(props))
  })

  let lastTimestamp = Date.now()
  async function postHeartbeat() {
    setTimeout(() => {
      let curr = Date.now()
      let elapsed = curr - lastTimestamp // elapsed milliseconds

      socket.emit('heartbeat', {
        id,
        elapsed
      })

      lastTimestamp = curr
    }, 1000)
  }

  postHeartbeat()
  socket.on('heartbeat', props => {
    console.log(props)
  })

  socket.on('leaderboard', props => {
    console.log(props)
  })

  socket.emit('leaderboard')

  socket.on('error', props => {
    console.log(props)
  })
})
