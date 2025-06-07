FROM ghcr.io/puppeteer/puppeteer:latest

ENV NODE_ENV=production
ENV PPTRUSER_UID=10042

USER root

#RUN echo "deb http://ftp.debian.org/debian stretch-backports main" >> /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y imagemagick

USER $PPTRUSER_UID

WORKDIR /home/pptruser

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY --chown=$PPTRUSER_UID package*.json ./

RUN npm install --only=production
#RUN npm install puppeteer-core
RUN npm install puppeteer

# Bundle app source
COPY . .

ENTRYPOINT [ "node", "theia.js" ] 