# Gitter-Forwarder

This application forwards messages from Gitter rooms to Slack channels in one-way fasion. To start an application execute: 

```bash
sudo docker run \
  -p 80:80 \
  -e GITTER_TOKEN=${GITTER_TOKEN} \
  -e SLACK_TOKEN=${SLACK_TOKEN} \
  -e SLACK_CLIENT_ID=${SLACK_CLIENT_ID} \
  -e SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET} \
  -e SLACK_VERIFICATION_TOKEN=${SLACK_VERIFICATION_TOKEN} \
  -e POSTGRES_USER=${POSTGRES_USER} \
  -e POSTGRES_PASS=${POSTGRES_PASS} \
  -e POSTGRES_HOST=${POSTGRES_HOST} \
  -e POSTGRES_PORT=${POSTGRES_PORT} \
  -e POSTGRES_DATABASE=${POSTGRES_DATABASE} \
  tidylobster/gitter-forwarder
```