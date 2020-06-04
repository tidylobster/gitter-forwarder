const { WebClient } = require('@slack/client');
const Gitter = require("node-gitter");
const { logger } = require('./log.js');
const { SubscriptionsRepository } = require('./repository.js');

const slack = new WebClient(process.env.SLACK_TOKEN);
const gitter = new Gitter(process.env.GITTER_TOKEN);
const repository = new SubscriptionsRepository();

const GitterController = function() {};

GitterController.prototype.init = async function() {
  /*
  Initialize controller instance and subscribe to all URIs.
  */
  (await repository.getAllUri()).forEach(async (sub) => {
    try {
      subscribeAllListeners(await gitter.rooms.findByUri(sub.gitterUri));
      logger.info(`Successfully initialized all listeners for ${sub.gitterUri}.`);
    } catch (error) {
      logger.error(`An error occurred during subscription to ${sub.gitterUri}: ${error}`);
      // removeAllListeners(await gitter.rooms.findByUri(sub.gitterUri));
      // logger.warning(`Permanently removed subscriptions to ${sub.gitterUri}`);
    }
  });
};

GitterController.prototype.subscribe = async function(gitterUri, channelId) {
  /*
  Subscribe a new channel for a given room.
  */
  const room = await gitter.rooms.findByUri(gitterUri);
  subscribeAllListeners(room);
  repository.addForChannel(channelId, gitterUri);
  logger.info(`Subscribed to ${gitterUri}`);
};

GitterController.prototype.unsubscribe = async function(gitterUri, channelId) {
  /*
  Unsubscribe given channel from room.
  */
  const room = await gitter.rooms.findByUri(gitterUri);
  cleanAllListeners(room);
  repository.removeForChannel(channelId, gitterUri);
  logger.info(`Unsubscribed from ${gitterUri}`);
};

GitterController.prototype.list = async function(channelId) {
  /*
  List all subscriptions for a given channel.
  */
  return repository.getByChannel(channelId);
};

async function subscribeAllListeners(room) {
  /*
  Subscribe all listeners for all channels.
  */
  room.subscribe();
  room.on("chatMessages", messageListener(room)); 
  room.on("event", eventListener(room));
  room.on("users", userListener(room));
}

async function cleanAllListeners(room) {
  /*
  Gracefully remove all listeners if there are no more subscriptions.
  */
  const subscriptions = repository.getByUri(room.uri);
  if ((await subscriptions).length === 0) {
    let resource, resourceName;
    ["chatMessages", "events", "users"].forEach(event => {
      resourceName = `/api/v1/rooms/${room.id}/${event}`;
      resource = gitter.faye.subscriptions[resourceName];
      resource.emitter.removeAllListeners();
      delete gitter.faye.subscriptions[resourceName];
    });
  }
}

async function removeAllListeners(room) {
  /*
  Forcefully remove all listeners and notify subscriptions.
  */
  const subscriptions = repository.getByUri(room.uri);
  (await subscriptions).forEach(sub => {
    slack.chat.postMessage({
      channel: sub.channelId,
      text: `Unsubscribed from ${room.uri}`
    });
    let resource, resourceName;
    ["chatMessages", "events", "users"].forEach(event => {
      resourceName = `/api/v1/rooms/${room.id}/${event}`;
      resource = gitter.faye.subscriptions[resourceName];
      resource.emitter.removeAllListeners();
      delete gitter.faye.subscriptions[resourceName];
    });
    sub.destroy();
  });
}

function buildAttachment(event, room) {
  /*
  Build a message body to be sent.
  */
  let attachment = {
    color: "#c8c9cc",
    footer: event.model.fromUser.displayName || event.model.fromUser.username,
    footer_icon: event.model.fromUser.avatarUrlSmall,
    title: room.uri,
    title_link: `https://gitter.im${room.url}?at=${event.model.id}`,
    ts: Math.floor(new Date(event.model.sent).getTime() / 1000),
  }
  if (event.model.text.startsWith("[![image.png](")) {
    attachment["image_url"] = event.model.text.slice(14).split("]")[0].slice(0, -1);
  } else {
    attachment["text"] = event.model.text;
  }
  return attachment;
}

function messageListener(room) {
  return async function (event) {
    if (event.operation !== 'create') {
      // Skip all events that are not of type CREATE
      return
    }
    const subscriptions = repository.getByUri(room.uri);
    const attachment = buildAttachment(event, room);
    (await subscriptions).forEach(sub => {
      slack.chat.postMessage({
        channel: sub.channelId,
        attachments: [attachment]
      });
    });
  };
}

function eventListener(room) {
  return async function (event) {
    logger.info(`New event occurred: ${JSON.stringify(event)}`);
  };
}

function userListener(room) {
  return async function (event) {
    logger.info(`User event occurred: ${JSON.stringify(event)}`);
  };
}

module.exports = GitterController;