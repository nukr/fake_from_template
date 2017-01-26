const faker = require('faker')
const fs = require('fs')
const schema = require('./schema/user.json')
const cloneDeep = require('lodash.clonedeep')
const shuffle = require('lodash.shuffle')
const uuid = require('uuid')
const now = require('performance-now')
const http = require('http')
const r = require('rethinkdbdash')({
  buffer: 50,
  max: 100
})

const NUM_FAKE = 20000

function traverse (o, func) {
  for (let i in o) {
    if (o[i] !== null && typeof(o[i]) === 'object') {
      traverse(o[i], func)
    } else {
      o[i] = func(o[i])
    }
  }
}

faker.custom = {
  timestamp: () => {
    return Date.now()
  },
  fbid: () => {
    let r = Math.round(Math.random() * Math.pow(10, 15))
    return String(r).padStart(15, '0')
  },
  binary: () => {
    return Math.random() * 10 > 5 ? 1 : 0
  },
  userType: () => {
    return shuffle(["shopper", "admin", "machine"])[0]
  },
  uuidNoDash: () => {
    return uuid.v4().replace(/-/g, '')
  }
}

function func (template) {
  if (typeof template !== 'string') {
    return template
  }
  // find first matching {{ and }}
  const start = template.search('{{')
  const end = template.search('}}')

  // if no {{ and }} is found, we are done
  if (start === -1 && end === -1) {
    return template
  }
  let method = template.replace('{{', '').replace('}}', '')
  let parts = method.split('.')
  let f = faker[parts[0]]
  for (let i = 1; i < parts.length; i += 1) {
    f = f[parts[i]]
  }
  return f.call(faker[parts[0]])
}

const start = now()
let counter = 0
let options = {
  hostname: 'localhost',
  port: 12345,
  method: 'POST',
  path: '/graphql',
  headers: {
    'x-meepcloud-access-token': 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0ODUzMjk1ODgsImlzcyI6Im1lZXBjbG91ZC5jb20iLCJqdGkiOiIzMDM4NDcxMi01OTY5LTQxNjYtODYyNS0zOTY3ZjkwZGJkMTIifQ.9D4aek8sjbWMlcz9wYODPeq_cXBdgTVbZgiaq7q6qP3cyUMaCi1PZ6sLwtuNYxLyHrwKD3IEp4eoqnGBKYDkLA',
    'x-meepcloud-service-name': 'meepshop'
  }
}

function insert () {
  const o = cloneDeep(schema)
  traverse(o, func)
  const req = http.request(options, res => {
    console.log(res.statusCode)
    res.on('data', chunk => {
    })
    res.on('end', () => {
      counter += 1
      console.log('end', counter)
      if (counter === NUM_FAKE) {
        console.log('done')
      } else {
        insert()
      }
    })
  })
  req.write(JSON.stringify({
    query: `
    mutation M($body: PlainObject) {
      createObject(table: "user", body: $body)
    }
    `,
    variables: {
      body: o
    }
  }))
  req.end()
}
