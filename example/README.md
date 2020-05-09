## Running
```bash
# Follow installation instructions from the root of this repo

cd example

# Change the email address in random.json

# Run random example config
docker-compose run --rm theia ./configs/random.json

# See the screen that was generated
ls screens/

# Run the random example config again
docker-compose run --rm theia ./configs/random.json

# See the current version, the previous and the diff. These should also be emailed to you by now. If not then check if you've configured config.js properly
ls screens/
```