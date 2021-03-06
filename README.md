# Gitter-Forwarder

This application forwards messages from Gitter rooms to Slack channels in one-way fashion. 

To start an application, use:

```sh
$ npm install
$ node src/index.js
```

This application requires the following environment variables being set.

| Environment Variable | Description |
| -------------------- | ----------- |
| GITTER_TOKEN         | Your personal access token for Gitter API. Can be obtainer here: https://developer.gitter.im/docs/welcome |
| SLACK_TOKEN          | Bot user OAuth access token. Checkout this for more details: https://api.slack.com/docs/oauth | 
| SLACK_CLIENT_ID      | Your Slack application's client ID. Find more information here: https://api.slack.com/slack-apps | 
| SLACK_CLIENT_SECRET  | Your Slack application's client secret. | 
| SLACK_VERIFICATION_TOKEN | Your Slack application's verification token. |
| POSTGRES_USER        | Postgres database user. |
| POSTGRES_PASSWORD    | Postgres database password. | 
| POSTGRES_HOST        | Postgres database host address. | 
| POSTGRES_PORT        | Postgres database port. |
| POSTGRES_DATABASE    | Postgres database name. |
