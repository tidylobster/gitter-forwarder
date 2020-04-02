var models = require('./models.js'); 
var Gitter = require("node-gitter"); 
const { WebClient } = require('@slack/client');

var slack = new WebClient(process.env.SLACK_TOKEN);
var client = new Gitter(process.env.GITTER_TOKEN);

// Show, which user's credentials are used under the hood
client.currentUser().then(user => console.log(`Logged in as @${user.username}`));

var GitterManager = function() {
  // Subscribe to all available rooms after manager was first initialized
  models.sequelize.query('SELECT DISTINCT gitter_uri FROM subscriptions')
    .then(([results]) => results.map(x => x.gitter_uri))
    .then(uris => subscribe_all(uris))
}; 

GitterManager.prototype.subscribe = function(uri, channel_id, user_id) {
  return client.rooms.findByUri(uri)
    .then(
      room => {
        subscribe_listeners(room);
        return models.Subscription.create({ channel_id: channel_id, gitter_uri: uri, user_id: user_id })
          .then(
            success => { return Promise.resolve(`Subscribed to ${uri}`); },
            error => {
              if (error instanceof models.sequelize.Sequelize.UniqueConstraintError ) {
                return Promise.reject("Already subscribed to this room");
              };
              throw "Sorry, unexpected behavior ocurred on the server";
            }
          );
      }, 
      error => {
        if (error.message.startsWith("404: ")) {
          return Promise.reject(`Cannot find *${uri}* room. Try another one.`);
        } else {
          throw "Sorry, unexpected behavior ocurred on the server";
        }
      }
    );
}

GitterManager.prototype.unsubscribe = function(uri, channel_id) {
  return client.rooms.findByUri(uri)
    .then(
      room => {
        return models.Subscription.destroy({
          where: {
            gitter_uri: room.uri,
            channel_id: channel_id
          }
        }).then(
          result => {
            if (result == 0) {
              return Promise.reject(`This channel isn't subscribed to ${room.uri}`);
            } else {
              clean_listeners(room);
              return Promise.resolve(`Unsubscribed from ${room.uri}`);
            }
          }
        )
      }, 
      error => {console.log(error)});
};

GitterManager.prototype.list = function(channel_id) {
  return models.Subscription.findAll({
    where: { channel_id: channel_id }
  }).then(rows => {
    if (rows.length != 0) {
      return Promise.resolve(`This channel is subscribed to the following rooms:\n`+
        `${rows.map(x => `- <https://gitter.im/${x.gitter_uri}|${x.gitter_uri}>`).join("\n")}`);
    } else {
      return Promise.resolve("This channel is not subscribed to any room"); 
    }
  })
};

function subscribe_all(uris) {
  uris.forEach(uri => {
    client.rooms.findByUri(uri)
      .then(
        room => subscribe_listeners(room), 
        () => models.Subscription.destroy({
          where: { gitter_uri: uri, }
        })
      )
  });
}

function subscribe_listeners(room) {
  room.subscribe();
  room.on("chatMessages", message_listener(room)); 
  room.on("event", event_listener(room));
  room.on("users", user_listener(room));
}

function message_listener(room) {
  var room = room;
  return function (event) {
    if (event.operation != 'create') return;
    models.Subscription.findAll({
      where: {gitter_uri: room.uri}
    }).then(rows => {
      var attachments = [{
        color: "#c8c9cc",
        footer: event.model.fromUser.displayName || event.model.fromUser.username,
        footer_icon: event.model.fromUser.avatarUrlSmall,
        title: room.uri,
        title_link: `https://gitter.im${room.url}`,
        ts: Math.floor(new Date(event.model.sent).getTime() / 1000),
      }]

      let image_pattern = /^\[\!.+\..+\]\((.+)\)$/g;
      match = image_pattern.exec(event.model.text);
      if (match) {
        attachments[0]["image_url"] = match[1];
      } else {
        attachments[0]["text"] = event.model.text;
      }

      rows.forEach(row => slack.chat.postMessage({ channel: row.channel_id, attachments: attachments }));
    })
  };
}

function event_listener(room) {
  var room = room;
  return function (event) {
    console.log(`New event ocurred: ${JSON.stringify(event)}`);
  };
};

function user_listener(room) {
  var room = room; 
  return function (event) {
    console.log(`User event ocurred: ${JSON.stringify(event)}`);
  };
};

function clean_listeners(room) {
  models.Subscription.findAll({
    where: { gitter_uri: room.uri }
  }).then(rows => {
      if (rows.length == 0) {
        var resource, resource_name;
        ["chatMessages", "events", "users"].forEach(event_type => {
          resource_name = `/api/v1/rooms/${room.id}/${event_type}`;
          resource = client.faye.subscriptions[resource_name];
          resource.emitter.removeAllListeners();
          delete client.faye.subscriptions[resource_name];
        })
        console.log(`Removed all listeners from ${room.uri}`);
      }; 
    }
  );
} 

module.exports = GitterManager;
