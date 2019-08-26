From node:stretch

RUN mkdir -p /usr/app

WORKDIR /usr/app

COPY . /usr/app

RUN npm install --production

EXPOSE 3000

CMD ["npm", "start"]