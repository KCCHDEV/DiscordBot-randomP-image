import { Client, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import config from './config';
import { NightAPI } from "night-api";
import { ImageCache } from './utils/imageCache';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const api = new NightAPI(config.apikey);
const imageCache = new ImageCache();

async function fetchNewImage(maxAttempts = 5): Promise<any> {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const response = await api.nsfw.fetchImage();
        if (!imageCache.hasImage(response.content)) {
            await imageCache.addImage(response.content);
            return response;
        }
        attempts++;
    }
    return null;
}

client.once('ready', async () => {
    console.log('Bot is ready!');
    await imageCache.init();
    
    setInterval(async () => {
        const image = await fetchNewImage();
        if (image) {
            console.log('New unique image:', image);
            for (const channelConfig of config.channels) {
                try {
                    const guild = client.guilds.cache.get(channelConfig.serverId);
                    if (!guild) continue;
                    
                    const channel = guild.channels.cache.get(channelConfig.channelId) as TextChannel;
                    if (channel) {
                        await channel.send(image.content.url);
                    }
                } catch (error) {
                    console.error(`Failed to send to channel ${channelConfig.channelId}:`, error);
                }
            }
        } else {
            console.log('No new unique images found after max attempts');
        }
    }, config.delay);
});

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    if (message.content === '!cache status') {
        message.reply(`Cache is currently ${imageCache.isEnabled() ? 'enabled' : 'disabled'}`);
    }
    
    if (message.content === '!cache on') {
        imageCache.setEnabled(true);
        message.reply('Cache enabled');
    }
    
    if (message.content === '!cache off') {
        imageCache.setEnabled(false);
        message.reply('Cache disabled');
    }

    if (message.content === '!cache clear') {
        await imageCache.clearCache();
        message.reply('Cache cleared');
    }

    if (message.content === '!downloads') {
        const downloadsPath = path.join(__dirname, '../downloads');
        try {
            const types = await fs.readdir(downloadsPath);
            const stats = await Promise.all(types.map(async (type) => {
                const files = await fs.readdir(path.join(downloadsPath, type));
                return `${type}: ${files.length} files`;
            }));
            message.reply(`Downloaded images:\n${stats.join('\n')}`);
        } catch (error) {
            message.reply('No downloads yet or error reading downloads folder');
        }
    }

    if (message.content === '!download status') {
        message.reply(`Download is currently ${imageCache.downloader.isEnabled() ? 'enabled' : 'disabled'}`);
    }
    
    if (message.content === '!download on') {
        imageCache.downloader.setEnabled(true);
        message.reply('Download enabled');
    }
    
    if (message.content === '!download off') {
        imageCache.downloader.setEnabled(false);
        message.reply('Download disabled');
    }

    if (message.content.startsWith('!addchannel')) {
        if (!message.member?.permissions.has('Administrator')) {
            return message.reply('You need administrator permissions to use this command.');
        }
        
        const serverId = message.guildId;
        if (!serverId) {
            return message.reply('This command can only be used in servers.');
        }
        const channelId = message.channelId;
        
        if (!config.channels.some(c => c.channelId === channelId)) {
            config.channels.push({ serverId, channelId });
            message.reply('Channel added to image distribution list!');
        } else {
            message.reply('This channel is already in the distribution list!');
        }
    }

    if (message.content.startsWith('!removechannel')) {
        if (!message.member?.permissions.has('Administrator')) {
            return message.reply('You need administrator permissions to use this command.');
        }
        
        const channelId = message.channelId;
        const index = config.channels.findIndex(c => c.channelId === channelId);
        
        if (index !== -1) {
            config.channels.splice(index, 1);
            message.reply('Channel removed from image distribution list!');
        } else {
            message.reply('This channel is not in the distribution list!');
        }
    }

    if (message.content === '!listchannels') {
        if (!message.member?.permissions.has('Administrator')) {
            return message.reply('You need administrator permissions to use this command.');
        }
        
        const channelList = config.channels.map(c => 
            `Server: ${client.guilds.cache.get(c.serverId)?.name || 'Unknown'} (${c.serverId})\n` +
            `Channel: ${client.channels.cache.get(c.channelId)?.toString() || 'Unknown'}`
        ).join('\n\n');
        
        message.reply(channelList || 'No channels configured');
    }
});

client.login(config.BOT_TOKEN);