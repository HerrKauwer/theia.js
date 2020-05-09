![License](https://img.shields.io/badge/license-ISC-blue.svg)

# theia.js
Takes screenshots of webpages and watches for changes. Emails the result.

The goal of this project was to make a simple webpage watcher. I started to use a service called VisualPing a while ago and I really liked the idea. I was missing some features and I was pretty much like: how hard can it really be.

This resulted in theia.js. I didn't recreate the GUI and this tool should be called with a scheduler such as **cron**.

You could use this tool to watch websites for price changes or check if your own website still works.

## Requirements
    * Docker
    * Docker-compose

## Building

```bash
$ git clone https://github.com/HerrKauwer/theia.js.git
$ cd theia.js
$ docker build -t theia .
```

### Configure email server in example/config.js
theia.js uses [nodemailer](https://github.com/nodemailer/nodemailer) to send emails. The included config.js contains an example for Gmail. For more info see their Github page.

## The config file
Every page that you want to watch requires a config file. These files are JSON formatted and 2 required properties:

```
{
  "url": "https://github.com/",
  "email": "myemail@example.com"
}
```

url: what url should be checked

email: the email address to send the results to

There a 4 optional properties:

```
{
  "viewportSize": { "width": 1024, "height": 768 },
  "clipRect": { "left": 279, "top": 495, "width": 709, "height": 1807 },
  "cookies": [
    {
      "name": "consent",
      "value": "1",
      "path": "/",
      "domain": "www.example.com"
    }
  ],
  "mode": 1
}
```

viewportSize: http://phantomjs.org/api/webpage/property/viewport-size.html

clipRect: http://phantomjs.org/api/webpage/property/clip-rect.html

cookies: a collection of cookies that should be send with the request. Make sure the domain matches the url. This is useful for sites that display a big popup when you haven't accepted their cookie terms yet.

mode: by default theia.js only sends an email when changes were detected. Set this to 1 if you want to receive and e-mail every time. It won't display the differences if you do that.

## Example configs
This config checks the GitHub homepage for changes and sends an email when something has changed.

github.json

```
{
  "viewportSize": { "width": 1024, "height": 768 },
  "url": "https://github.com/",
  "email": "myemail@example.com"
}
```

This config takes a screenshot of the reddit logo and sends and sends that per email. It also sets a cookie.

reddit.json

```
{
  "viewportSize": { "width": 1024, "height": 768 },
  "clipRect": { "left": 0, "top": 19, "width": 117, "height": 45 },
  "url": "https://www.reddit.com/",
  "cookies": [
    {
      "name": "example",
      "value": "some value",
      "path": "/",
      "domain": "www.reddit.com"
    }
  ],
  "email": "myemail@example.com"
}
```

## Example cron job

    0 10 * * * cd /opt/theia.js && docker-compose run --rm theia github.json >> /var/log/theia.js/github.log 2>&1

---
I hope you find this project useful, at least I enjoyed building it. Development is still ongoing. Feel free send in feature requests.

## License
ISC © 2020 Marvin Kauw
