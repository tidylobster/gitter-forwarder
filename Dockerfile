FROM node:8.15-alpine

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install 
COPY src/* /app/

EXPOSE 80
CMD node index.js