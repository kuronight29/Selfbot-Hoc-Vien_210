const { Client, Intents } = require("discord.js-selfbot-v13");
const { joinVoiceChannel } = require("@discordjs/voice");
const sqlite3 = require("sqlite3").verbose();

// Initialize database
const db = new sqlite3.Database("commands.db");

// Create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS command_timings (
  command TEXT PRIMARY KEY,
  last_used INTEGER
)`);

// Function to check and update command timing
async function checkAndExecuteCommand(
  command,
  channel,
  interval,
  response = null
) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT last_used FROM command_timings WHERE command = ?",
      [command],
      (err, row) => {
        const now = Date.now();
        if (!row || now - row.last_used >= interval) {
          // Add 2 second delay to command execution
          setTimeout(() => {
            channel.send(command).catch(console.error);
            console.log(`📨 Sent command: ${command}`);

            // Always send "ok" after 5 seconds
            setTimeout(() => {
              channel.send("ok").catch(console.error);
            }, 5000);

            // If there's an additional response, send it after the "ok"
            if (response && response !== "ok") {
              setTimeout(() => {
                channel.send(response).catch(console.error);
              }, 7000); // 5s for "ok" + 2s additional delay
            }

            db.run(
              "INSERT OR REPLACE INTO command_timings (command, last_used) VALUES (?, ?)",
              [command, now]
            );
            resolve(true);
          }, 2000);
        } else {
          console.log(
            `⏳ Skipping ${command}, time remaining: ${
              (interval - (now - row.last_used)) / 1000
            }s`
          );
          resolve(false);
        }
      }
    );
  });
}

const client = new Client({
  checkUpdate: false,
});

// Add reaction channels array - replace with your channel IDs
const reactionChannels = [
  "1229716511401316404", "1229716774195433472", "1292849609214918656",
  "1292849535432917062", "1302993772006609007", "1281154949077798912",
  "1281155099590135878", "1281155158922760273", "1281155174253199444",
  "1281155289625923676", "1281155308684574723", "1281162728366538784",
  "1281162745600937994", "1281155597718257664", "1281155620782735461",
	"1281162942200545380", "1281162959850176574", "1281163276008292352",
    "1282037994890461265", "1281163523199864904", "1281163551700025426",
    "1281163648672337951"
    
];

// Function to get random messages from a channel
async function getRandomMessages(channel, limit = 10) {
  const messages = await channel.messages.fetch({ limit: 10 });
  return messages.random(Math.min(messages.size, limit));
}

// Function to handle reactions with better error handling
async function addReactions() {
  console.log('🔄 Starting reaction cycle...');
  
  for (const channelId of reactionChannels) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.log(`⚠️ Cannot find channel: ${channelId}`);
      continue;
    }

    try {
      console.log(`📝 Fetching messages from channel: ${channel.name}`);
      const messages = await channel.messages.fetch({ limit: 10 }); // Changed to 100 messages
      if (messages.size === 0) {
        console.log(`⚠️ No messages found in channel: ${channel.name}`);
        continue;
      }

      for (const [_, message] of messages) {
        try {
          const reactions = message.reactions.cache;
          if (reactions.size === 0) {
            console.log(`⚠️ No reactions found in message: ${message.id}`);
            continue;
          }

          const randomReaction = reactions.random();
          console.log(`👉 Attempting to react with ${randomReaction.emoji.name} to message in ${channel.name}`);
          await message.react(randomReaction.emoji);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay to 2s
        } catch (reactionError) {
          console.error(`❌ Failed to react to message: ${reactionError.message}`);
        }
      }
      console.log(`✅ Completed reactions in channel: ${channel.name}`);
    } catch (error) {
      console.error(`❌ Error in channel ${channel.name}:`, error.message);
    }
  }
}

// Add this after the client declaration but before the ready event
async function clickButtonAndReact(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    for (const [_, message] of messages) {
      if (message.author.id === '1194945094176997396' && message.components.length > 0) {
        const button = message.components[0].components[0];
        if (button) {
          await message.clickButton();
          console.log('🖱️ Clicked button successfully');
          
          // Wait 10 seconds then send emoji
          await new Promise(resolve => setTimeout(resolve, 10000));
          await channel.send('<:HTVN_CatKek:1311332029518057492>');
          console.log('😺 Sent emoji reaction');
          break;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in clickButtonAndReact:', error);
  }
}

let baucuaInterval, coinInterval, workInterval;
client.on("ready", async () => {
  console.log(`✅ ${client.user.username} is ready!`);

  const channel = client.channels.cache.get("1299710124125978717");
  if (!channel) {
    console.error("❌ Could not find the specified channel");
    return;
  }

  // Initial commands with database checking
  const sendCommands = async () => {
    await checkAndExecuteCommand(".work", channel, 3600000);
    await checkAndExecuteCommand(",work", channel, 3600000);
    await checkAndExecuteCommand("!work", channel, 3600000);
    await checkAndExecuteCommand(".daily", channel, 86400000);
    await checkAndExecuteCommand(",daily", channel, 86400000);
    await checkAndExecuteCommand("!daily", channel, 86400000);
    await checkAndExecuteCommand(".feed", channel, 14400000, "đã feed");
    
    // Add fishing work slash command
    try {
        const fishingBot = client.users.cache.get('1257713292445618239');
        if (fishingBot) {
            await channel.sendSlash(fishingBot.id, 'work fishing');
            console.log(`📨 Sent slash command: /work fishing`);
        }
    } catch (error) {
        console.error('❌ Error sending fishing work command:', error);
    }
  };

  // Initial run with delay
  setTimeout(sendCommands, 1000);

  // Join a voice channel
  const voiceChannel = client.channels.cache.get("1299710124125978717");
  if (voiceChannel && voiceChannel.isVoice()) {
    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    console.log(`🔊 Joined voice channel: ${voiceChannel.name}`);
  } else {
    console.error("❌ Could not find the specified voice channel");
  }

  // Set up intervals with database checking
  setInterval(async () => {
    await checkAndExecuteCommand(".work", channel, 3600000, "ok");
    await checkAndExecuteCommand(",work", channel, 3600000, "ok");
    await checkAndExecuteCommand("!work", channel, 3600000, "ok");
    
    // Add fishing work slash command to interval
    try {
        const fishingBot = client.users.cache.get('1257713292445618239');
        if (fishingBot) {
            await channel.sendSlash(fishingBot.id, 'work fishing');
            console.log(`📨 Sent slash command: /work fishing`);
        }
    } catch (error) {
        console.error('❌ Error sending fishing work command:', error);
    }
  }, 60000); // Check every minute

  setInterval(async () => {
    await checkAndExecuteCommand(".feed", channel, 14400000, "đã feed");
  }, 60000);

  // Modify reaction interval to run every 30 minutes
  setInterval(async () => {
    console.log('⏰ Reaction interval triggered');
    await addReactions();
  }, 1800000); // Changed to 30 minutes (1800000 ms)

  // Initial reaction run with longer delay
  console.log('🚀 Scheduling initial reaction run...');
  setTimeout(addReactions, 10000); // Changed to 10 seconds

  // Add this before the end of ready event
  const buttonChannel = client.channels.cache.get("1270200067550216236");
  if (buttonChannel) {
    console.log('🔄 Starting button clicking interval...');
    // Initial click after 5 seconds
    setTimeout(() => clickButtonAndReact(buttonChannel), 5000);
    
    // Set interval for every 10 minutes and 5 seconds
    setInterval(() => clickButtonAndReact(buttonChannel), 605000);
  } else {
    console.error("❌ Could not find button channel");
  }
});

client
  .login(
    "MTAwNzYzMTk4NjYyMzUyNDk2NQ.GZHPh4.YQAJ49PDBDYO20YMfeCoCy8lkZGeDiPbmqknwk"
  )
  .catch(console.error);
