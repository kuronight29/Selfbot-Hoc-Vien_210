const { Client, Intents } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const sqlite3 = require('sqlite3').verbose();

// Initialize database
const db = new sqlite3.Database('commands.db');

// Create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS command_timings (
  command TEXT PRIMARY KEY,
  last_used INTEGER
)`);

// Function to check and update command timing
async function checkAndExecuteCommand(command, channel, interval, response = null) {
  return new Promise((resolve, reject) => {
    db.get('SELECT last_used FROM command_timings WHERE command = ?', [command], (err, row) => {
      const now = Date.now();
      if (!row || (now - row.last_used) >= interval) {
        // Add 2 second delay to command execution
        setTimeout(() => {
          channel.send(command).catch(console.error);
          console.log(`📨 Sent command: ${command}`);
          
          // Always send "ok" after 5 seconds
          setTimeout(() => {
            channel.send('ok').catch(console.error);
          }, 5000);
          
          // If there's an additional response, send it after the "ok"
          if (response && response !== 'ok') {
            setTimeout(() => {
              channel.send(response).catch(console.error);
            }, 7000); // 5s for "ok" + 2s additional delay
          }

          db.run('INSERT OR REPLACE INTO command_timings (command, last_used) VALUES (?, ?)',
            [command, now]);
          resolve(true);
        }, 2000);
      } else {
        console.log(`⏳ Skipping ${command}, time remaining: ${(interval - (now - row.last_used))/1000}s`);
        resolve(false);
      }
    });
  });
}

const client = new Client({
  checkUpdate: false,
});

let baucuaInterval, coinInterval, workInterval;
client.on('ready', async () => {
  console.log(`✅ ${client.user.username} is ready!`);
  
  const channel = client.channels.cache.get('1299710124125978717');
  if (!channel) {
    console.error('❌ Could not find the specified channel');
    return;
  }

  // Initial commands with database checking
  const sendCommands = async () => {
    await checkAndExecuteCommand('.work', channel, 3600000);
    await checkAndExecuteCommand(',work', channel, 3600000);
    await checkAndExecuteCommand('!work', channel, 3600000);
    await checkAndExecuteCommand('.daily', channel, 86400000);
    await checkAndExecuteCommand(',daily', channel, 86400000);
    await checkAndExecuteCommand('!daily', channel, 86400000);
    await checkAndExecuteCommand('.feed', channel, 14400000, 'đã feed');
  };

  // Initial run with delay
  setTimeout(sendCommands, 1000);

  // Join a voice channel
  const voiceChannel = client.channels.cache.get('1299710124125978717');
  if (voiceChannel && voiceChannel.isVoice()) {
    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    console.log(`🔊 Joined voice channel: ${voiceChannel.name}`);
  } else {
    console.error('❌ Could not find the specified voice channel');
  }

  // Set up intervals with database checking
  setInterval(async () => {
    await checkAndExecuteCommand('.work', channel, 3600000, 'ok');
    await checkAndExecuteCommand(',work', channel, 3600000, 'ok');
    await checkAndExecuteCommand('!work', channel, 3600000, 'ok');
  }, 60000); // Check every minute

  setInterval(async () => {
    await checkAndExecuteCommand('.feed', channel, 14400000, 'đã feed');
  }, 60000);
});

client.login('YOUR TOKEN ').catch(console.error);