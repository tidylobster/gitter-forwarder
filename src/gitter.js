var models = require('./models.js'); 
var Gitter = require("node-gitter"); 
const { WebClient } = require('@slack/client');

var slack = new WebClient(process.env.SLACK_TOKEN);
var client = new Gitter(process.env.GITTER_TOKEN);

// Show, which user's credentials are under the hood
client.currentUser().then(user => console.log(`Logged in as @${user.username}`));

var GitterManager = function() {

  // Subscribe to all available rooms after instance was first initialized
  models.sequelize.query('SELECT DISTINCT gitter_uri FROM subscriptions')
    .then(([results]) => { return results.map(x => x.gitter_uri);})
    .then(uris => this.subscribe_all(uris))
}; 

GitterManager.prototype.subscribe_all = function(uris) {
  var promises = [];
  uris.forEach(uri => {
    promises.push(client.rooms.findByUri(uri))
  });

  Promise.all(promises).then(results => {
    results.forEach(room => {
      this.subscribe_handlers(room);
    });
  });
};

GitterManager.prototype.subscribe = function(uri, channel_id, user_id) {
  return client.rooms.findByUri(uri)
    .then(
      room => {
        this.subscribe_handlers(room);
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
        models.Subscription.destroy({
          where: {
            gitter_uri: room.uri,
            channel_id: channel_id
          }
        }).then(
          result => {
            if (result == 0) {
              return Promise.reject(`This channel isn't subscribed to ${room.uri}`);
            } else {
              this.clean_listeners(room);
              return Promise.resolve(`Unsubscribed from ${room.uri}`);
            }
          }
        )
      }, 
      error => {console.log(error)});
};

GitterManager.prototype.clean_listeners = function(room) {
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

GitterManager.prototype.subscribe_handlers = function(room) {
  room.subscribe();
  room.on("chatMessages", message_handler(room)); 
  room.on("event", event_handler(room));
  room.on("users", user_handler(room));
};

function message_handler(room) {
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

      if (event.model.text.startsWith("[![image.png](")) {
        attachments[0]["image_url"] = event.model.text.slice(14).split("]")[0].slice(0, -1);; 
      } else {
        attachments[0]["text"] = event.model.text;
      }

      rows.forEach(row => {
        slack.chat.postMessage({ channel: row.channel_id, attachments: attachments });
      });
    })
  };
};

function event_handler(room) {
  var room = room;
  return function (event) {
    console.log(`New event ocurred: ${JSON.stringify(event)}`);
  };
};

function user_handler(room) {
  var room = room; 
  return function (event) {
    console.log(`User event ocurred: ${JSON.stringify(event)}`);
  };
};


module.exports = GitterManager;