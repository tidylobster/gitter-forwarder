var Subscription = require('./database.js'); 
var Gitter = require("node-gitter"); 
const { WebClient } = require('@slack/client');

var slack = new WebClient(process.env.SLACK_TOKEN);

var GitterManager = function() {
  if (!process.env.GITTER_TOKEN) {
    throw "GITTER_TOKEN is undefined"; 
  }

  this.client = new Gitter(process.env.GITTER_TOKEN);
  this.uris   = [
    "tidylobster/community", "scala/scala", 
    "Hydrospheredata/hydro-serving", "Hydrospheredata/mist"];
  
  this.client.currentUser()
    .then(user => console.log(`Logged in as @${user.username}`));
}; 

GitterManager.prototype.subscribe_all = function() {
  var promises = [];
  this.uris.forEach(uri => {
    promises.push(this.client.rooms.findByUri(uri))
  });

  Promise.all(promises).then(results => {
    results.forEach(room => {
      this.subscribe_handlers(room);
    });
  });
};

GitterManager.prototype.subscribe = function(uri, channel_id, user_id) {
  return this.client.rooms.findByUri(uri)
    .then(
      room => {
        this.subscribe_handlers(room);
        return Subscription.create({ 
          channel_id: channel_id, 
          gitter_uri: uri, 
          user_id: user_id 
        });
      }, 
      error => {
        if (error.message.startsWith("404: ")) {
          return Promise.reject(`Cannot find *${uri}* room. Try another one.`);
        } else {
          throw "Sorry, unexpected behavior ocurred on the server";
        }
      });
}

GitterManager.prototype.unsubscribe = function(uri) {
  this.client.rooms.findByUri(uri)
    .then(room => {
      var resource, resource_name;
      ["chatMessages", "events", "users"].forEach(event_type => {
        resource_name = `/api/v1/rooms/${room.id}/${event_type}`;
        resource = this.client.faye.subscriptions[resource_name];
        resource.emitter.removeAllListeners();
        delete this.client.faye.subscriptions[resource_name];
      })
    }, error => {console.log(error)});
};

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
    Subscription.findAll({
      where: {gitter_uri: room.uri}
    }).then(rows => {
      var attachments = [{
        color: "#168BF2",
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
    console.log(`New event ocurred: ${event}`);
  };
};

function user_handler(room) {
  var room = room; 
  return function (event) {
    console.log(`User event ocurred: ${event}`);
  };
};


module.exports = GitterManager;