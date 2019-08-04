FROM node:10

WORKDIR /app

ADD ./package.json /app/package.json

RUN npm install

ADD . /app

RUN npm run dist

EXPOSE 3000

CMD npm start