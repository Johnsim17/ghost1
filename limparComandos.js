import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🧹 Limpando comandos...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );
    console.log('✅ Comandos antigos foram removidos.');
  } catch (error) {
    console.error('❌ Erro ao limpar comandos:', error);
  }
})();