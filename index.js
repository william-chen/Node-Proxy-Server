let http = require('http')
let fs = require('fs')
let request = require('request')
let through = require('through')
let argv = require('yargs')
	.default('host', '127.0.0.1')
	.argv
let scheme = 'http://'
let port = argv.port || argv.host === '127.0.0.1' ? 8000 : 80
let destinationUrl = argv.url || scheme + argv.host + ':' + port
let logStream = argv.logging? fs.createWriteStream(argv.logging) : process.stdout

http.createServer((req, res) => {
  logStream.write(`Request received at: ${req.url}` + '\n')
  for (let header in req.headers) {
    res.setHeader(header, req.headers[header])
  }
  through(req, logStream, {autoDestroy: false})
  req.pipe(res)
}).listen(8000)

http.createServer((req, res) => {
  logStream.write(`Proxying request to: ${destinationUrl + req.url}`)
  let url = destinationUrl
  if (req.headers['x-destination-url']) {
	   url = req.headers['x-destination-url']
  }
  let options = {
	   headers: req.headers,
	   url: url + req.url
  }
  options.method = req.method
  //console.log(`going to ${options.url}`)

  // log the request headers and content in our server callback
  logStream.write('\n\n\n' + JSON.stringify(req.headers) + '\n')
  through(req, logStream, {autoDestroy: false})

  // log the proxy request headers and content in our server callback
  let downstreamResponse = req.pipe(request(options))
  logStream.write(JSON.stringify(downstreamResponse.headers) + '\n')
  downstreamResponse.pipe(res)
  through(downstreamResponse, logStream, {autoDestroy: false})
}).listen(8001)
