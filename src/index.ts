import { Bot } from './bot';

const bot: Bot = new Bot();
bot.start();

//////////////////////////////
// Hot module replacement
//////////////////////////////

declare const module: any;
if (module.hot) {
    handleHotModuleReplacement();
}

/**
 *  After code changes are accepted we need to restart the app.
 */
async function handleHotModuleReplacement() {
    module.hot.accept();
    module.hot.dispose(async () => await bot.restart());
}
