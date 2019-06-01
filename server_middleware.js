const fs = require('fs')
const vm = require('vm')

const fetch = require('node-fetch')

const sandbox = {
  fetch: fetch,
  Request: fetch.Request,
  Response: fetch.Response,
  Headers: fetch.Headers,
  URL: URL,
  console: {
    log: console.log,
    error: console.error,
  },
  RENDER_ENV: 'server',
  process: {
    env: {
      RENDER_ENV: 'server',
      NODE_ENV: 'production',
    },
  },
  setTimeout,
  setImmediate,
  clearTimeout,
  module: {
    exports: {},
  },
}

const src = fs.readFileSync('./fab/server.js')
const script = new vm.Script(src)
const renderer = script.runInNewContext(sandbox)

const render = async (req, res, settings) => {
  const { method, headers, body } = req
  const url = `https://${req.headers.host}${req.url}`
  const options =
    req.method.toUpperCase() === 'GET' ? { method, headers } : { method, headers, body }
  const fetch_req = new fetch.Request(url, options)
  const fetch_res = await renderer.render(fetch_req, settings)
  res.status(fetch_res.status)

  const response_headers =
    typeof fetch_res.headers.raw === 'function'
      ? fetch_res.headers.raw()
      : mapToObj(fetch_res.headers)

  // Fetch responses always decode their contents, so we
  // have to avoid passing through a content-encoding header
  // that now doesn't match what we're sending.
  delete response_headers['content-encoding']
  Object.keys(response_headers).forEach((header) => {
    const values = response_headers[header]
    res.set(header, values.length === 1 ? values[0] : values)
  })
  const blob = await fetch_res.arrayBuffer()
  res.set('content-length', blob.byteLength)
  res.send(Buffer.from(blob))
}

module.exports = ({ settings = {} } = {}) => {
  return async (req, res) => {
    await render(req, res, settings)
  }
}
