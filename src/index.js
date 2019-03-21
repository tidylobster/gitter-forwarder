var GitterManager = require('./gitter.js');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var gitter = new GitterManager(); 
var port = process.env.SLACK_LISTEN_PORT;
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/', urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400);
  if (req.body.token != process.env.SLACK_VERIFICATION_TOKEN) return res.sendStatus(401);

  parts = req.body.text.split(" ")

  if (parts.length < 1) {
    return res.json({
      "text": "You have to provide one of the following parameters: [subscribe, unsubscribe, list]"
    })
  }

  if (!["subscribe", "unsubscribe", "list"].includes(parts[0])) {
    return res.json({
      "text": "Only 3 parameters are available: [subscribe, unsubscribe, list]"
    })
  }

  // Unhandled rejection Error: Can't set headers after they are sent.
  if (parts.length == 1 && parts[0] == "list") {
    return gitter.list(req.body.channel_id)
      .then(response => { return res.json({"text": response}) });
  } 

  if (parts.length != 2) {
    return res.json({
      "text": "You have to provide exactly 2 parameters: "+
        "[subscribe, unsubscribe] organization/room"
    })
  } else if (!["subscribe", "unsubscribe"].includes(parts[0])) {
    return res.json({
      "text": "Use only one of [subscribe, unsubscribe] parameters with organization/room."
    })
  }
  
  if (parts[0] == 'subscribe') {
    return gitter.subscribe(uri=parts[1], channel_id=req.body.channel_id, user_id=req.body.user_id)
      .then(
        success => {
          return res.json({
            "response_type": "in_channel",
            "attachments": [{"text": success}]
          })
        },
        failure => {
          return res.json({"text": failure})
        }
      ).catch(error => console.log(error));
  } 
  
  if (parts[0] == 'unsubscribe') {
    return gitter.unsubscribe(uri=parts[1], channel_id=req.body.channel_id)
      .then(
        success => {
          return res.json({
            "response_type": "in_channel",
            "attachments": [{"text": success}]
          })
        },
        failure => {
          return res.json({"text": failure})
        }
      ).catch(error => console.log(error));
  }
})

app.listen(port, () => console.log(`Slack client is listening on port ${port}!`))