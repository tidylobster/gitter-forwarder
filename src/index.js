var GitterManager = require('./gitter.js');
var app = require('express')
var bodyParser = require('body-parser')

var port = process.env.SLACK_LISTEN_PORT;
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/', urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400)
  console.log(req.body)
  res.send(`Hello there, ${req.body.user_name}`)
})

app.listen(port, () => console.log(`Slack client is listening on port ${port}!`))