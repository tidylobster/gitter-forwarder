var Subscription = require('./database.js'); 
var Gitter = require("node-gitter"); 

var GitterManager = function() {
  if (!process.env.GITTER_TOKEN) {
    throw "GITTER_TOKEN is undefined"; 
  }

  this.client = new Gitter(process.env.GITTER_TOKEN);
  this.uris   = [];
  
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
          user_id: user_id });
      }, 
      error => {
        if (error.message.startsWith("404: ")) {
          return Promise.reject(`Cannot find '${uri}' room. Try another one.`);
        } else {
          throw "Unexpected behavior";
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
    console.log(`[${room.name}] @${event.model.fromUser.username}: ${event.model.text}`); 
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