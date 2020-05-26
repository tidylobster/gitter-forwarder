const GitterController = require('./controller.js');
const { logger, logLevel } = require('./log.js');
const express = require('express');
const bodyParser = require('body-parser');

let isInitialized = false;

const app = express();
const app_port = process.env.APP_PORT || 80;
const controller = new GitterController();
const urlencodedParser = bodyParser.urlencoded({extended: false});

app.post('/', urlencodedParser, async function (req, res) {
  if (!req.body) {
    // Bad request
    return res.sendStatus(400);
  }
  if (!req.body.token) {
    // Can't find any token
    return res.sendStatus(401);
  }
  if (req.body.token !== process.env.SLACK_VERIFICATION_TOKEN) {
    // Can't authorize request
    return res.sendStatus(403);
  }

  const args = req.body.text.split(" ");
  if (args.length < 1) {
    return res.json({
      text: "You have to provide one of the following arguments:\n" +
        "/gitter [subscribe, unsubscribe, list]"
    })
  }

  if (!["subscribe", "unsubscribe", "list"].includes(args[0])) {
    return res.json({
      text: "Only 3 command types are available:\n" +
        "/gitter [subscribe, unsubscribe, list]"
    })
  }

  if (args.length === 1 && args[0] === "list") {
    try {
      const subs = await controller.list(req.body.channel_id);
      if (subs.length !== 0) {
        return res.json({
          text: `This channel is subscribed to the following rooms:\n` +
            `${subs.map(x => `- <https://gitter.im/${x.gitterUri}|${x.gitterUri}>`).join("\n")}`
        });
      } else {
        return res.json({
          text: "This channel isn't subscribed to any rooms.",
        });
      }
    } catch {
      return res.json({
        text: "Internal Error: Unable to list subscriptions for this channel."
      });
    }
  } 

  if (args.length !== 2) {
    return res.json({
      text: "You have to provide exactly 2 arguments:\n" +
        "/gitter [subscribe, unsubscribe] organization/room"
    })
  }

  switch (args[0]) {
    case 'subscribe':
      try {
        await controller.subscribe(args[1], req.body.channel_id);
        return res.json({
          response_type: "in_channel",
          attachments: [{"text": `Subscribed to ${args[1]}`}]
        });
      } catch {
        return res.json({
          text: `Internal Error: Unable to subscribe to ${args[1]}`
        });
      }
      break;
    
    case 'unsubscribe': 
      try {
        await controller.unsubscribe(args[1], req.body.channel_id);
        return res.json({
          response_type: "in_channel",
          attachments: [{"text": `Unsubscribed from ${args[1]}`}]
        });
      } catch {
        return res.json({
          text: `Internal Error: Unable to unsubscribe from ${args[1]}`
        });
      }
      break;
  }
});

app.get('/readiness', urlencodedParser, async function(req, res) {
  if (isInitialized) {
    return res.sendStatus(200);
  } else {
    return res.sendStatus(503);
  }
});

app.get('/liveness', urlencodedParser, async function(req, res) {
  return res.sendStatus(200);
});

app.listen(app_port, async () => {
  await controller.init();
  isInitialized = true;
  logger.info(
    `APP_PORT=${app_port} ` +
    `LOG_LEVEL=${logLevel} `
  );
  logger.info(`Slack client is listening on port ${app_port}!`);
});
