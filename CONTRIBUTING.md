In order to develop we need a test environment. I'm not sure if this is the preferred way to test a discord bot but I've found it works for me.

## Pre-Req
1. Install [Node.JS](https://nodejs.org/en/download/).
2. Install `Typescript` globally by opening a command prompt and running `npm install -g Typescript`.
3. Get a [PUBG API Key](https://developer.playbattlegrounds.com/).

## Create your own Discord Testing Bot
1. Go here [Discord Bot Guide](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token) and create a new Discord bot and a bot user that you can use on our own personal Discord server for testing.
2. Note this is where you can get your Discord bot user's token.
3. Go ahead and add your bot to your Discord server.
4. I recommend making a private channel that only you and your bot has access to so you don't annoy people on your server.

## Getting the code
1. Fork this repo.
2. Wehn developing work in the forked repo.
3. When you're ready to merge into the main repo make a pull request.

## Setting up Heroku
1. Go to [Heroku.com](https://www.heroku.com/).
2. Create a new Node app.
3. Go to the `Resources` tab and under `Add-ons` install `Heroku Postgres` .
    * This will add a `DATABASE_URL` config under the `Settings` tabs.

## Install the Herokou CLI
1. Follow these [direction](https://devcenter.heroku.com/articles/heroku-cli).

## Install PsSql CLI tools
1. Follow the [PsSql install guide](https://devcenter.heroku.com/articles/heroku-postgresql#local-setup).

### How to get DATABASE_URL
1. Click the `Resources` tab.
2. Under the `Add-ons` section click `Heroku Postgres:: Database`.
3. On the new page click the `Settings` tab.
4. Click `View Credentials` and the `DATABASE_URL` will be the value of `URI`

## Setting up your .env file
1. Open the code in your favorite code editor - I recommend VS Code.
2. Open the `.env` file.
3. On Heroku, open your app and go to the `Settings` tab.
4. Click `Reveal Config Vars`.
5.
    * ownerid=`<Your Discord id>`
    * bot_token=`<discord bot user's token>`  -- refer to above documentation.
    * bot_user_id=`<Bot's user id>`
    * isDev=`true`
    * prefix=`!pubg-`
    * alert_channel_id=`<Channel ID>`  -- this channel will be used to alert when the bot is connected
    * pubg_api_key=`<PUBG Api Key>`
    * mixpanel_api_key=`<Analytics platform key>`  -- this should be uneeded
    * discord_bots_api_key=`<DiscordBots integration key>`  -- this should be uneeded
    * DATABASE_URL=`<Heroku supplied Database Url>` - In Heroku under the `Settings` tab of your app.

## Run Database Migrations
1. Open a console and navigate to where the project code is located.
2. Run `npm run build:prod && npm run migrate`.
