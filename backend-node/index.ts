import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { db } from './db'
import { v4 as uuid } from 'uuid'
import { Server as HTTPServer } from 'http'
import 'dotenv/config'
import * as http from "http";

const dbg = false
const energyGain = 30

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*"
  }
})

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

io.on('connection', async client => {
  const auth = async (id: string): Promise<User> => {
    const user = {
      id,
      ...await get(id).catch(err => {
        console.log("ERROR")
        throw new Error('Invalid ID')
      })
    }
    //console.log("User", user)
    return user as User
  }
  
  client.on('new', async () => {
    // Generate unique ID
    const id = (await db.incr("id_max")).toString(36)

    db.set(
      id,
      JSON.stringify({
        points: 0,
        energy: 120,
        zombie: false
      })
    )
    db.set(`socket-${client.id}`, JSON.stringify({id}))

    client.emit("id", JSON.stringify({
      id,
      points: 0,
      energy: 120,
      zombie: false
    }))
  })

  client.on("about", async data => {
    const user = await auth(data.id)
    // console.log(user)
    client.emit("about", JSON.stringify(user))
  })

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
      if (key == 'id_max') continue
      mapped.push({
        id: key,
        ...(await get(key))
      })
    }
    mapped = mapped.sort((a: User, b: User) => {
      if ((a.points || 0) > (b.points || 0)) return -1
      return 1
    })
    client.emit('leaderboard', JSON.stringify(mapped))
  })

  client.on('username', async data => {
    const user = await auth(data.id).catch(err => {
      client.emit('error', err.toString())
    })
    client.emit(
      'username',
      await set(
        data.id,
        JSON.stringify({
          ...user,
          username: data.username
        })
      ) as any
    )
  })

  client.on('heartbeat', async data => {
    const user = await auth(data.id).catch(err => {
      client.emit('error', err.toString())
    })
    // Decrement energy, too
    if (user) {
      let energy = user.energy <= 0 ? 0 : user.energy - Math.floor(data.elapsed / 1000)
      // console.log(energy)
      let updated = await set(
        data.id,
        JSON.stringify({
          ...user,
          points: user.points + (user.zombie ? 0 : data.elapsed / (1000 * 10)),
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
      //console.log("Updated heartbeat", updated)
      client.emit('about', JSON.stringify(updated))
    }
  })

  client.on('tag', async data => {
    if (data.taggee == data.tagger) return

    // Tagged -
    // tagger is zombie, taggee is human: take all points
    // otherwise, ignore
    const tagger = await auth(data.tagger)
    const taggee = await auth(data.taggee)

    console.log("tagged!!", tagger.username, taggee.username)
    console.log("wahooo", tagger.id, taggee.id)

    if (tagger.zombie && !taggee.zombie) {
      // Transfer points from human to zombie, and turn human into zombie
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
          points: tagger.points + points,
          zombie: true
        })
      )
      client.emit(
        'tag',
        {
          tagger: taggerUpdated,
          taggee: taggeeUpdated,
          me: taggeeUpdated
        } as any
      )
    }
  })

  client.on('beacon', async data => {
    // With every scan, you get 30s of energy
    const user = await auth(data.id).catch(err => {
      client.emit('error', err.toString())
    })
    if (dbg) console.log('Refilling user', user)
    // Convert to human too
    client.emit(
      'beacon',
      await set(
        data.id,
        JSON.stringify({
          ...user,
          energy: energyGain,
          zombie: false
        })
      ) as any
    )
  })

  client.on('disconnect', async () => {
    // Grab socket-${client.id} and use it to grab user ID -> delete key
    const id = (await get(`socket-${client.id}`))?.id
    if (id) db.del(id)
  })
})

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log('Listening on port', port)
})
