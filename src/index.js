var GitterManager = require('./gitter.js');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var port = process.env.SLACK_LISTEN_PORT;
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/', urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400)

  console.log(req.body)
  parts = req.body.text.split(" ")
  if (parts.length != 2) {
    return res.json({
      "text": "You have to provide exactly 2 parameters: "+
        "[subscribe, unsubscribe] organization/conversation"
    })
  } else if (parts[0] != "subscribe" || parts[1] != "unsubscribe") {
    return res.json({
      "text": "Only 2 commands are available: [subscribe, unsubscribe]"
    })
  } else if (parts[0] == 'subscribe') {
    return res.json({
      "response_type": "in_channel",
      "attachments": [
        {
          "text": `Subscribed to ${parts[1]}`
        }
      ]
    })
  } else if (parts[0] == 'unsubscribe') {
    return res.json({
      "response_type": "in_channel",
      "attachments": [
        {
          "text": `Unsubscribed from ${parts[1]}`
        }
      ]
    })
  }
})

app.listen(port, () => console.log(`Slack client is listening on port ${port}!`))