var GitterManager = require('./gitter.js');
var http = require('http');

http.createServer(function (req, res) {
  console.log(req);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World!');
  res.end();
}).listen(80);

console.log('Server running at http://localhost:80/');