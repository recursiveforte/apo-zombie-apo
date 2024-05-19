import { Redis } from 'ioredis'
import 'dotenv/config'

const redisClient = () => {
  const redis = new Redis(
    Number(process.env.REDIS_PORT),
    process.env.REDIS_HOST,
    {
      maxRetriesPerRequest: 3
    }
  )

  return redis
}

export const db = redisClient()

async function main() {
  db.flushdb(cb => {
    console.log(cb)
  })
}

if (require.main === module) {
  if (process.argv.includes("--clear")) {
    main()
  }
}