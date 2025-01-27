import { Client, GatewayIntentBits } from 'discord.js';
import config from './config';


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log('Bot is ready!');
});


client.login(config.BOT_TOKEN);