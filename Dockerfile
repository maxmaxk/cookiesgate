ARG NODE_VERSION=18

FROM node:$NODE_VERSION-alpine

WORKDIR /cookiesgate
COPY package.json /cookiesgate/package.json
COPY package-lock.json /cookiesgate/package-lock.json
RUN npm install

COPY . /cookiesgate/

CMD [ "node", "/cookiesgate/gate.js" ]