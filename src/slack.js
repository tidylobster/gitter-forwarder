const { RTMClient, WebClient } = require('@slack/client');

const token = process.env.SLACK_TOKEN;

// The client is initialized and then started to get an active connection to the platform
const rtm = new RTMClient(token);
rtm.start();

// Need a web client to find a channel where the app can post a message
const web = new WebClient(token);

// (async () => {
//   // Load the current channels list asynchronously
//   const res = await web.channels.list();

//   // Take any channel for which the bot is a member
//   const channel = res.channels.find(item => item.name == 'gitter');
  

//   if (channel) {
//     // We now have a channel ID to post a message in!
//     // use the `sendMessage()` method to send a simple string to a channel using the channel ID
//     // const msg = await rtm.sendMessage('Hello, world!', channel.id);

//     // `msg` contains information about the message sent
//     console.log(`Channel ${channel.name}`);
//     // console.log(`Message sent to channel ${channel.name} with ts:${msg.ts}`);
//   } else {
//     console.log('This bot does not belong to any channel, invite it to at least one and try again');
//   }
// })();

rtm.on('message', (message) => {
  // For structure of `message`, see https://api.slack.com/events/message

  // Skip messages that are from a bot or my own user ID
  if ( (message.subtype && message.subtype === 'bot_message') ||
       (!message.subtype && message.user === rtm.activeUserId) ) {
    return;
  }

  // Log the message
  console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
});