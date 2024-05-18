import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { db } from './db'
import { v4 as uuid } from 'uuid'
import { Server as HTTPServer } from 'http'
import 'dotenv/config'

const dbg = false
const energyGain = 30

const app = express()
app.use(
  cors({
    origin: '*'
  })
)

const server = new HTTPServer(app)
const io = new Server(server)

type User = {
  id: string
  socket: string
  energy: number
  points: number
  zombie: boolean
  lastTaggedBy: {
    id: string
    time: number
  }
}

const get = async (key: string): Promise<{ [key: string]: any }> =>
  new Promise((resolve, reject) => {
    db.get(key, (err, result) => {
      if (err) return reject(err)
      resolve(JSON.parse(result))
    })
  })

const set = async (
  key: string,
  value: string
): Promise<{ [key: string]: any }> =>
  new Promise((resolve, reject) => {
    db.set(key, value, (err, result) => {
      if (err) return reject(err)
      resolve(JSON.parse(value))
    })
  })

app.get('/', (_, res) => {
  res.send('Hello, world!')
})

const calcPoints = (elapsed: number) => {
  return elapsed / 10
}

io.on('connection', client => {
  const auth = async (props: { id: string }): Promise<User> => {
    const user = await get(props.id).catch(err => {
      throw new Error('Invalid ID')
    })
    return user as User
  }

  // Generate unique ID
  const id = uuid()
  db.set(
    id,
    JSON.stringify({
      points: 0,
      energy: 120,
      zombie: false
    })
  )
  db.set(`socket-${client.id}`, JSON.stringify({ id }))

  client.emit(client.id, JSON.stringify({ id }))

  client.on('leaderboard', async data => {
    const getAllKeys = async (): Promise<string[]> =>
      new Promise((resolve, reject) => {
        db.keys('*', (err, result) => {
          if (err) return reject(err)
          resolve(result)
        })
      })
    let leaderboard = await getAllKeys()
    leaderboard = leaderboard.filter(key => !key.startsWith('socket'))
    let mapped = []
    for (let key of leaderboard) {
      mapped.push({
        key,
        ...(await get(key))
      })
    }
    mapped = mapped.sort((a: User, b: User) => {
      if ((a.points || 0) > (b.points || 0)) return -1
      return 1
    })
    console.log(mapped)
    client.emit('leaderboard', JSON.stringify(mapped))
  })

  client.on('username', async data => {
    const user = await auth(data).catch(err => {
      client.emit('error', err.toString())
    })
    if (dbg) console.log('Updating username', data)
    client.emit(
      'username',
      JSON.stringify(
        await set(
          data.id,
          JSON.stringify({
            ...user,
            username: data.username
          })
        )
      )
    )
  })

  client.on('heartbeat', async data => {
    const user = await auth(data).catch(err => {
      client.emit('error', err.toString())
    })
    // Decrement energy, too
    if (user) {
      let energy = user.energy - data.elapsed
      let updated = await set(
        data.id,
        JSON.stringify({
          ...user,
          points: user.points + (user.zombie ? 0 : calcPoints(data.elapsed)),
          energy
        })
      )
      if (energy <= 0) {
        // Become zombie.
        updated = await set(
          data.id,
          JSON.stringify({
            ...updated,
            zombie: true
          })
        )
      }
      client.emit('heartbeat', JSON.stringify(updated))
    }
  })

  client.on('tag', async data => {
    // Tagged -
    // tagger is human, taggee is human: take all points
    // tagger is zombie, taggee is human: take all points
    // otherwise, ignore
    const tagger = await auth(data.tagger)
    const taggee = await auth(data.taggee)
    // if (!tagger.zombie && !taggee.zombie) {
    //   // Check lastTaggedBy to make sure
    //   const timestamp = Date.now()
    //   if (
    //     taggee.lastTaggedBy.id === tagger.id &&
    //     timestamp - taggee.lastTaggedBy.time > 5
    //   ) {
    //     // Possible race conditions. Do not allow taggee to get points.
    //     client.emit('error', 'Invalid time range')
    //   }

    //   // Transfer points from human to human
    //   const points = taggee.points
    //   const taggeeUpdated = await set(
    //     taggee.id,
    //     JSON.stringify({
    //       ...taggee,
    //       points: 0
    //     })
    //   )
    //   const taggerUpdated = await set(
    //     tagger.id,
    //     JSON.stringify({
    //       ...tagger,
    //       points: tagger.points + points
    //     })
    //   )
    //   client.emit(
    //     'tag',
    //     JSON.stringify({
    //       tagger: taggerUpdated,
    //       taggee: taggeeUpdated,
    //       me: taggerUpdated
    //     })
    //   )
    // } else
    if (tagger.zombie && !taggee.zombie) {
      // Transfer points from human to zombie
      const points = taggee.points
      const taggeeUpdated = await set(
        taggee.id,
        JSON.stringify({
          ...taggee,
          points: 0
        })
      )
      const taggerUpdated = await set(
        tagger.id,
        JSON.stringify({
          ...tagger,
          points: tagger.points + points
        })
      )
      client.emit(
        'tag',
        JSON.stringify({
          tagger: taggerUpdated,
          taggee: taggeeUpdated,
          me: taggerUpdated
        })
      )
    }
  })

  client.on('beacon', async data => {
    // With every scan, you get 30s of energy
    const user = await auth(data).catch(err => {
      client.emit('error', err.toString())
    })
    if (dbg) console.log('Refilling user', user)
    // Convert to human too
    client.emit(
      'beacon',
      JSON.stringify(
        await set(
          data.id,
          JSON.stringify({
            ...user,
            energy: energyGain,
            zombie: false
          })
        )
      )
    )
  })

  client.on('disconnect', async () => {
    // Grab socket-${client.id} and use it to grab user ID -> delete key
    const { id } = await get(`socket-${client.id}`)
    if (id) db.del(id)
  })
})

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log('Listening on port', port)
})
