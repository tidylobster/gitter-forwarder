FROM node:12.16.3-slim

RUN useradd --create-home --shell /bin/bash app
USER app

WORKDIR /home/app

# Install node dependencies
COPY package.json package-lock.json /home/app/
RUN npm install

# Copy source files
COPY src/ ./src

CMD ["npm", "start"]