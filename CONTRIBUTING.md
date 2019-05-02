In order to develop we need a test environment with **node** and **postgres**. Luckily, we can use Docker to simplify setting up our DEV Environment.

## Pre-Req
1. Install and setup **Docker**. You will need to enable sharing your dev computer's volumes with Docker in its settings.
2. Install `Typescript` globally by opening a command prompt and running `npm install -g Typescript`.
3. Get a [PUBG API Key](https://developer.playbattlegrounds.com/).

## Create your own Discord Testing Bot
1. Go here [Discord Bot Guide](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token) and create a new Discord bot and a bot user that you can use on our own personal Discord server for testing.
2. Note this is where you can get your Discord bot user's token.
3. Go ahead and add your bot to your Discord server.
4. I recommend making a private channel that only you and your bot has access to so you don't annoy people on your server.

## Getting the code
1. Fork this repo.
2. Develop in your forked repo.
3. When you're ready to merge into the main repo make a pull request.

## Setting up Environment variables
1. Open the code in your favorite code editor - I recommend VS Code.
2. Open the `.env` file.
3.
    * ownerid=`<Your Discord id>`
    * bot_token=`<discord bot user's token>`  -- refer to above documentation.
    * bot_user_id=`<Bot's user id>`
    * isDev=`true`
    * prefix=`!pubg-`
    * alert_channel_id=`<Channel ID>`  -- [Optional] this channel will be used to alert when the bot is connected
    * pubg_api_key=`<PUBG Api Key>`
    * mixpanel_api_key=`<Mixpanel platform key>`  -  [Optional]
    * discord_bots_api_key=`<DiscordBots integration key>`  --  [Optional]

## Running the code
1. Go into `/app` to have access to `package.json`
2. In one terminal run `npm docker-compose:dev`
3. In another terminal run `npm run build:dev`
4. You should be able to develop now, change code locally, and have docker restart the bot when changes are detected.
