const models = require('./models.js');
const logger = require('./log.js');
const Gitter = require("node-gitter");
const { WebClient } = require('@slack/client');

const slack = new WebClient(process.env.SLACK_TOKEN);
const client = new Gitter(process.env.GITTER_TOKEN);

// Show, which user's credentials are used under the hood
client.currentUser().then(user => logger.info(`Logged in as @${user.username}`));

const GitterManager = function () {
  // Subscribe to all available rooms after manager was first initialized
  models.sequelize.query('SELECT DISTINCT gitter_uri FROM subscriptions')
      .then(([results]) => results.map(x => x.gitter_uri))
      .then(uris => subscribeAll(uris))
};

GitterManager.prototype.subscribe = function(uri, channelId, userId) {
  return client.rooms.findByUri(uri)
    .then(
      room => {
        subscribeAllListeners(room);
        return models.Subscription.create({ channel_id: channelId, gitter_uri: uri, user_id: userId })
          .then(
            success => { return Promise.resolve(`Subscribed to ${uri}`); },
            error => {
              if (error instanceof models.sequelize.Sequelize.UniqueConstraintError ) {
                return Promise.reject("Already subscribed to this room");
              };
              throw "Sorry, unexpected behavior occurred on the server";
            }
          );
      }, 
      error => {
        if (error.message.startsWith("404: ")) {
          return Promise.reject(`Cannot find *${uri}* room. Try another one.`);
        } else {
          throw "Sorry, unexpected behavior occurred on the server";
        }
      }
    );
};

GitterManager.prototype.unsubscribe = function(uri, channelId) {
  return client.rooms.findByUri(uri)
    .then(
      room => {
        return models.Subscription.destroy({
          where: {
            gitter_uri: room.uri,
            channel_id: channelId
          }
        }).then(
          result => {
            if (result === 0) {
              return Promise.reject(`This channel isn't subscribed to ${room.uri}`);
            } else {
              cleanListeners(room);
              return Promise.resolve(`Unsubscribed from ${room.uri}`);
            }
          }
        )
      }, 
      error => {logger.error(error)});
};

GitterManager.prototype.list = function(channelId) {
  return models.Subscription.findAll({
    where: { channel_id: channelId }
  }).then(rows => {
    if (rows.length !== 0) {
      return Promise.resolve(`This channel is subscribed to the following rooms:\n`+
        `${rows.map(x => `- <https://gitter.im/${x.gitter_uri}|${x.gitter_uri}>`).join("\n")}`);
    } else {
      return Promise.resolve("This channel is not subscribed to any room"); 
    }
  })
};

function subscribeAll(uris) {
  uris.forEach(uri => {
    client.rooms.findByUri(uri)
      .then(
        room => subscribeAllListeners(room), 
        () => models.Subscription.destroy({
          where: { gitter_uri: uri, }
        })
      )
  });
}

function subscribeAllListeners(room) {
  room.subscribe();
  room.on("chatMessages", messageListener(room)); 
  room.on("event", eventListener(room));
  room.on("users", userListener(room));
}

function messageListener(room) {
  var room = room;
  return function (event) {
    if (event.operation !== 'create') return;
    models.Subscription.findAll({
      where: {gitter_uri: room.uri}
    }).then(rows => {
      let attachments = [{
        color: "#c8c9cc",
        footer: event.model.fromUser.displayName || event.model.fromUser.username,
        footer_icon: event.model.fromUser.avatarUrlSmall,
        title: room.uri,
        title_link: `https://gitter.im${room.url}`,
        ts: Math.floor(new Date(event.model.sent).getTime() / 1000),
      }];

      if (event.model.text.startsWith("[![image.png](")) {
        attachments[0]["image_url"] = event.model.text.slice(14).split("]")[0].slice(0, -1);
      } else {
        attachments[0]["text"] = event.model.text;
      }

      rows.forEach(row => slack.chat.postMessage({ channel: row.channel_id, attachments: attachments }));
    })
  };
}

function eventListener(room) {
  var room = room;
  return function (event) {
    logger.info(`New event occurred: ${JSON.stringify(event)}`);
  };
}

function userListener(room) {
  var room = room; 
  return function (event) {
    logger.info(`User event occurred: ${JSON.stringify(event)}`);
  };
}

function cleanListeners(room) {
  models.Subscription.findAll({
    where: { gitter_uri: room.uri }
  }).then(rows => {
      if (rows.length === 0) {
        let resource, resourceName;
        ["chatMessages", "events", "users"].forEach(eventType => {
          resourceName = `/api/v1/rooms/${room.id}/${eventType}`;
          resource = client.faye.subscriptions[resourceName];
          resource.emitter.removeAllListeners();
          delete client.faye.subscriptions[resourceName];
        });
        logger.info(`Removed all listeners from ${room.uri}`);
      }
    }
  );
} 

module.exports = GitterManager;