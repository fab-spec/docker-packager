const express = require('express')
const server_middleware = require('./server_middleware')

const app = express()

app.disable('x-powered-by')

app.use('/_assets', express.static('./fab/_assets', { immutable: true, maxAge: '1y' }))
app.use(server_middleware())

app.listen(3000)
