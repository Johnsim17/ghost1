const ms = require('ms');
require('dotenv').config()
const fs = require('fs');
const { Client, GatewayIntentBits, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, Partials, ChannelType, REST, Routes, EmbedBuilder, ButtonBuilder, ButtonStyle,
  Events, MessageFlags,  ApplicationCommandOptionType, ActivityType, AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const moment = require('moment-timezone');
const path = require('path');

const prefix = "!";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages
  ],
    partials: [Partials.Channel]
});

async function sendTempEmbed(message, embed, tempo = 90000) {
  const msg = await message.channel.send({ embeds: [embed] });
  message.delete().catch(() => {});
  setTimeout(() => msg.delete().catch(() => {}), tempo);
}

// Carregar posts
let postsData = {};
const savePosts = () => fs.writeFileSync('posts.json', JSON.stringify(postsData, null, 2));
if (fs.existsSync('posts.json')) postsData = JSON.parse(fs.readFileSync('posts.json', 'utf-8'));

const statsFile = 'stats.json';
let userStats = {};

function ensureStatsFile() {
  if (!fs.existsSync(statsFile)) {
    fs.writeFileSync(statsFile, JSON.stringify({}, null, 2), 'utf8');
  }
}

ensureStatsFile();

try {
  userStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  console.log(`📊 Estatísticas carregadas: ${Object.keys(userStats).length} usuários.`);
} catch (err) {
  console.error('Erro ao carregar estatísticas:', err);
  userStats = {};
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

const channelStatsFile = 'channelStats.json';
let channelStats = {};
if (!fs.existsSync(channelStatsFile)) fs.writeFileSync(channelStatsFile, JSON.stringify({}));
try {
    channelStats = JSON.parse(fs.readFileSync(channelStatsFile, 'utf8'));
} catch { channelStats = {}; }
function saveChannelStats() {
    fs.writeFileSync(channelStatsFile, JSON.stringify(channelStats, null, 2));
}

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

let logChannels = {};
try {
  logChannels = JSON.parse(fs.readFileSync('logChannels.json', 'utf8'));
} catch (err) {
  logChannels = {};
  console.error('Erro ao carregar logChannels.json:', err);
  sendErrorLog(`Erro ao carregar logChannels.json: ${err}`);
}

// tenta carregar dados já salvos
if (fs.existsSync("./stats.json")) {
  statsData = JSON.parse(fs.readFileSync("./stats.json", "utf8"));
}

// função pra salvar
function saveStats() {
  fs.writeFileSync("./stats.json", JSON.stringify(statsData, null, 2));
}

// Função única e centralizada para buscar canal de log (sempre async)
async function getLogChannel(guild, type) {
  const id = logChannels[type];
  if (!id) {
    console.warn(`[LOG] Tipo "${type}" não configurado no logChannels.json`);
    return null;
  }
  let channel = guild.channels.cache.get(id);
  if (!channel) {
    try {
      channel = await guild.channels.fetch(id);
    } catch {
      console.warn(`[LOG] Canal ID ${id} para "${type}" não encontrado em ${guild.name}`);
      return null;
    }
  }
  // Checagem compatível com discord.js v14+
  if (typeof channel.isTextBased === 'function' ? !channel.isTextBased() : channel.type !== 0) {
    console.warn(`[LOG] Canal ${channel.name} não é de texto`);
    return null;
  }
  if (!channel.permissionsFor(guild.members.me)?.has(PermissionsBitField.Flags.SendMessages)) {
    console.warn(`[LOG] Sem permissão para enviar mensagens em ${channel.name}`);
    return null;
  }
  return channel;
}

// Função central para logar ações em canal de log
function log(channel, content) {
  if (channel) {
    channel.send({ embeds: [new EmbedBuilder().setColor('Blue').setDescription(content).setTimestamp()] })
      .catch(err => {
        console.error('Erro ao enviar log para canal:', err);
        sendErrorLog(`Erro ao enviar log para canal: ${err}`);
      });
  }
}

// Função para logar erros em canal de erro, se existir
function sendErrorLog(content) {
  try {
    if (client && client.guilds && logChannels['erros']) {
      client.guilds.cache.forEach(async guild => {
        const ch = await getLogChannel(guild, 'erros');
        if (ch) {
          ch.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription(content).setTimestamp()] }).catch(() => {});
        }
      });
    }
  } catch {}
}

function saveStats() {
  fs.writeFileSync(statsFile, JSON.stringify(userStats, null, 2));
}

// Sistema de avisosurl
const avisosFilePath = './avisourl.json';
let avisosUrl = {};

if (fs.existsSync(avisosFilePath)) {
  try {
    avisosUrl = JSON.parse(fs.readFileSync(avisosFilePath, 'utf-8'));
  } catch (err) {
    console.error("Erro ao ler avisourl.json:", err);
    avisosUrl = {};
  }
}

function salvarAvisos() {
  fs.writeFileSync(avisosFilePath, JSON.stringify(avisosUrl, null, 2));
}

const warnsFile = path.join(__dirname, './warns.json');

function ensureWarnsFile() {
  if (!fs.existsSync(warnsFile)) {
    fs.writeFileSync(warnsFile, JSON.stringify({}, null, 2), 'utf8');
  }
}

function saveWarns() {
  ensureWarnsFile();
  fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2), 'utf8');
}

function loadWarns() {
  ensureWarnsFile();
  return JSON.parse(fs.readFileSync(warnsFile, 'utf8'));
}

let warns = loadWarns();

function embaralhar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// carregar permissões
function readJsonSafe(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Função auxiliar: verificar status do novo membro
function verificarStatus(member) {
  let problemas = [];

  // 1. Conta muito nova (menos de 7 dias)
  const criadoEm = member.user.createdAt;
  if (Date.now() - criadoEm.getTime() < 7 * 24 * 60 * 60 * 1000) {
    problemas.push("⚠️ Conta criada recentemente (menos de 7 dias)");
  }

  // 2. Nick com termos proibidos
  const nick = member.displayName.toLowerCase();
  const proibidos = [
    "cp", "child porn", "pedo", "pedofilia",
    "nazismo", "hitler", "nazi",
    "terrorismo", "isis", "taliban",
    "assassinato", "matança", "genocidio",
    "estupr", "rape", "molest",
    "merda", "foda-se", "puta", "buceta", "caralho", "viado"
  ];

  if (proibidos.some(p => nick.includes(p))) {
    problemas.push("🚨 Nick contém termos proibidos ou criminosos");
  }

  // 3. Caso não tenha nenhum problema
  return problemas.length ? problemas.join("\n") : "✅ Tudo certo";
}


// ======/ COMANDOS PREFIXO \ ======
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ===== Estatísticas =====
  if (!userStats[message.author.id]) {
    userStats[message.author.id] = { mensagens: 0, tempoCall: 0, lastJoin: null };
  }

  if (!channelStats[message.channel.id]) {
    channelStats[message.channel.id] = 0;
  }
  channelStats[message.channel.id]++;
  saveChannelStats();

  userStats[message.author.id].mensagens++;
  saveStats();

  // ===== Prefix Commands =====
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const cmdName = args.shift()?.toLowerCase();
  if (!cmdName) return;

// Função para logar comandos
async function logCommand(user, command, channel) {
  const logChannel = channel.guild.channels.cache.get(logChannels.comandos);
  if (logChannel?.isTextBased()) {
    const embed = new EmbedBuilder()
      .setTitle("<:robot1:1417223992468832266> Ghost Family - Comando Executado")
      .setColor("Blue")
      .addFields(
        { name: "<:Membro:1417224284128022598> Membro", value: `<@${user.id}> (${user.id})`, inline: false },
        { name: "<:canal1:1417225554796478514> Canal", value: `<#${channel.id}>`, inline: false },
        { name: "<:comandos1:1417224027843465406> Comando", value: `\`\`\`!${command}\`\`\``, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ 
        text: 'Ghost', 
        iconURL: 'https://cdn.discordapp.com/emojis/1412490276366192712.png'
      });

    await logChannel.send({ embeds: [embed] });
  }
}

// == EMBEDS ==

  if (cmdName === 'regras') {
    const attachment = new AttachmentBuilder('./regras.png');
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Regras do Servidor')
      .setColor('#4d0070')
      .setDescription(
`**Regras dos Chats**

> Proibição de conteúdo explícito
> Não é permitido compartilhar pornografia ou qualquer conteúdo explícito (imagens, vídeos, links ou qualquer outra forma).

*Respeito e ética*

> Trate todos com respeito e cordialidade. Qualquer forma de discriminação (homofobia, racismo, xenofobia, etc.) será rigorosamente proibida.

*Privacidade*

> Não compartilhe informações pessoais de outros membros sem autorização expressa.

*Conteúdos proibidos*

>  Não publique conteúdos racistas, homofóbicos, ofensivos ou impróprios.

*Flood e spam*

> Evite enviar mensagens em excesso que possam prejudicar a comunicação e o bom andamento das conversas.

*Divulgação externa*

> Não divulgue links ou conteúdos de outras comunidades, serviços ou plataformas sem autorização prévia.

*Comércio proibido*

> Vendas, transações comerciais ou qualquer atividade financeira não autorizada são proibidas neste ambiente.

---

**Regras dos Canais de Voz**

*Comportamento adequado*

> Mantenha o respeito, evite barulhos ou atitudes que possam perturbar os demais participantes.

*Modificadores de voz*

> É proibido o uso de modificadores ou distorções que prejudiquem a comunicação.

*Ambiente harmonioso*

> Evite discussões e mantenha um ambiente profissional e cordial.

*Uso de bots de música*

> Utilize bots de música com moderação, garantindo que não causem incômodo ou sobrecarga no canal.

---

**Informações Gerais**

> As regras podem ser atualizadas periodicamente. É responsabilidade de todos manter-se informados.
> O não cumprimento das regras pode resultar em medidas disciplinares adequadas, conforme avaliação da administração.

---

Agradecemos a colaboração e desejamos um ambiente produtivo e respeitoso para todos.`)
      .setImage('attachment://regras.png')
      .setFooter({ text: 'Ghost Family' })
      .setTimestamp();
    message.channel.send({ embeds: [embed], files: [attachment] });
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

  if (cmdName === 'regrasrec') {
    const attachment = new AttachmentBuilder('./regrasrec.png');
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Regras Recrutamento')
      .setColor('#4d0070')
      .setDescription(
`### <:relatorio1:1417223373129515038> Procedimentos básicos:

<:seta2:1417223069935734874> Pergunte se a pessoa tem interesse em entrar para uma família da CDL.

<:seta2:1417223069935734874> Explique que a Ghost Family realiza sorteios de Nitros, molduras, entre outros benefícios.


### <:relatorio1:1417223373129515038> Aliciamento:

<:seta2:1417223069935734874> Em hipótese alguma fale mal da família atual do membro.

<:seta2:1417223069935734874> Você pode perguntar se ele tem interesse em entrar para a Ghost Family.

<:seta2:1417223069935734874> Caso o membro aceite, peça ao mesmo para enviar mensagem para os líderes atuais da família onde ele se encontra.

<:seta2:1417223069935734874> Explique ao membro que nessa mensagem será pedindo a remoção da família atual e que o mesmo terá de esperar até não estar mais nessa família.

<:seta2:1417223069935734874> Após a remoção, o recrutador(a) poderá continuar com o recrutamento normal.

<:seta2:1417223069935734874> Se ele recusar, respeite a decisão e não insista. Insistência pode ser considerada uma quebra de regras.`)
      .setImage('attachment://regrasrec.png')
      .setFooter({ text: 'Ghost Family' })
      .setTimestamp();
    message.channel.send({ embeds: [embed], files: [attachment], });
    message.channel.send('||<@&1402155920456286280>|| ||<@&1402163096952377394>|| ||<@&1402161136580956264>||');
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

  if (cmdName === 'booster') {
    const attachment = new AttachmentBuilder('./booster.png');
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Seja Booster')
      .setColor('#4d0070')
      .setDescription(
`<:fantasma1:1417223879608500407> Deu Boost na Ghost Family? A gente nota. A gente valoriza. 
Aqui, quem apoia com Boost não passa batido.

Se você fortaleceu o servidor com um boost, saiba que isso faz diferença de verdade. E, claro, a gente retribui com carinho e vantagens especiais:

<:seta1:1417223045768151151> Cargo exclusivo para boosters.
<:seta1:1417223045768151151> Acesso a canais exclusivos.
<:seta1:1417223045768151151> Sorteios e eventos exclusivos para boosters.

A Ghost Family é feita por quem acredita e constrói junto.
Se você deu boost, obrigado de verdade. Sua contribuição faz a diferença!`)
      .setImage('attachment://booster.png')
      .setFooter({ text: 'Ghost Family' })
      .setTimestamp();
    message.channel.send({ embeds: [embed], files: [attachment] });
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

   if (cmdName === 'metasrec') {
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Metas Recrutamento')
      .setColor('#4d0070')
      .setDescription(
`<:aviso1:1417223663232749608> Prezados membros da equipe,

A fim de mantermos a organização e incentivarmos o crescimento contínuo da nossa comunidade, estabelecemos metas claras para progressão na hierarquia de recrutadores. Confira abaixo os requisitos atualizados:

<:seta2:1417223069935734874> Recrutador Gastly: Ter requisitos para entrar

<:seta2:1417223069935734874> Recrutador Haunter: Ter 20 recrutamentos feitos.

<:seta2:1417223069935734874> Recrutador Gengar: Ter 50 recrutamentos feitos.

<:seta2:1417223069935734874> Aux: Mérito.

<:seta2:1417223069935734874> Organizador: Mérito.

<:estrela4:1417222853610438846> Meta para manter no cargo de Recrutador e de 2 recs por semana

<:luazinha1:1417223623231410246> Contamos com o comprometimento de todos para manter o padrão de excelência e dedicação que sempre buscamos. Qualquer dúvida, procure um superior imediato.`)
      .setImage('https://cdn.discordapp.com/attachments/1402011730170745052/1404867084055351376/barrinha.png?ex=689cbfee&is=689b6e6e&hm=5076c5c56a54a4ccf64f31329cb287e964cd77202e46157200b062cc1d321032&')
      .setFooter({ text: 'Ghost Family' })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    message.channel.send('||<@&1402155920456286280>|| ||<@&1402163096952377394>|| ||<@&1402161136580956264>||');
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

  // !hierarquiarec
  if (cmdName === 'hierarquiarec') {
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Hierarquia Recrutamento')
      .setColor('#4d0070')
      .setDescription(
`<:aviso1:1417223663232749608> Prezados membros da equipe,

A fim de mantermos a organização e incentivarmos o crescimento contínuo da nossa comunidade, estabelecemos metas claras para progressão na hierarquia de recrutadores. Confira abaixo os requisitos atualizados:

<:estrela4:1417222853610438846> <@&1402155920456286280> 
<:seta2:1417223069935734874> Necessário requisitos.

<:estrela4:1417222853610438846> <@&1402161136580956264> 
<:seta2:1417223069935734874> Necessário 20 recrutamentos feitos.

<:estrela4:1417222853610438846> <@&1402163096952377394> 
<:seta2:1417223069935734874> Necessário 50 recrutamentos feitos.

<:estrela4:1417222853610438846> <@&1401669976124821666>
<:seta2:1417223069935734874> Requer mérito.

<:estrela4:1417222853610438846> <@&1401666557939159111>
<:seta2:1417223069935734874> Requer mérito.

<:luazinha1:1417223623231410246> Contamos com o comprometimento de todos para manter o padrão de excelência e dedicação que sempre buscamos. Qualquer dúvida, procure um superior imediato.`)
      .setImage('https://cdn.discordapp.com/attachments/1402307493480108173/1404856567878389760/52_Sem_Titulo_20250812115755.png?ex=689cb622&is=689b64a2&hm=e26b5480cb9ea671a60d6f41b7d764e9088d864235507afe55317cdf552881e7&')
      .setFooter({ text: 'Ghost Family' })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    message.channel.send('||<@&1402155920456286280>|| ||<@&1402163096952377394>|| ||<@&1402161136580956264>||');
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

  if (cmdName === 'verificacao') {
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Verificação')
      .setColor('#4d0070')
      .setDescription(
`<a:instagram1:1417228256620314796> Quer ser um Verificado da Ghost Family?

*Se você gosta do servidor e quer fazer parte da nossa história de uma forma especial, essa é a sua chance!*

*Para se tornar uma pessoa verificada da Ghost Family, é bem simples:*

<:cam1:1417228632291803298> Tire uma foto sua

<:estrela4:1417222853610438846> Após fazer isso, contate um verificador(a) e mande uma prova de que não é fake.

Logo em seguida vamos liberar seu acesso no canal <#1401686450193563730>, você irá mandar sua foto no canal, e no final você ganha o cargo de <@&1405953118658625587>

Esse cargo vem com destaque, reconhecimento e claro, respeito dentro da nossa família.

Então, se você curte aparecer, é criativo e quer se destacar...
Leia o chat <#1401686423169536020> para aprender a postar.
Posta tua foto no <#1401686450193563730> e vem brilhar com a gente!`)
  .setFooter({ text: 'Ghost Family' })
  .setTimestamp();
  message.channel.send({ embeds: [embed] });
  message.channel.send('<@&1401674214779392150>');
  message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
  }

  if (cmdName === 'explicativo') {
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Explicativo Verificação')
      .setColor('#4d0070')
      .setDescription(
`**<:Check1:1417223136134566010> Como realizar a verificação <:Check1:1417223136134566010>**

<:seta3:1417223096636801044> Caso o membro decida se verificar, você deve solicitar uma foto, um vídeo ou realizar uma chamada de voz com a câmera ligada, de forma que o rosto da pessoa seja visível.*

<:seta3:1417223096636801044> Após isso, verifique se o rosto apresentado é autêntico.*
*Se for possível confirmar a veracidade, envie a informação no canal de verificados da seguinte forma:*

**<a:estrela1:1417222398385586369> Membro verificado(a): [ID]**
**<a:estrela1:1417222398385586369> Mandou foto ou abriu a câmera?: Sim / Não**`)
    .setFooter({ text: 'Ghost Family' });
    message.channel.send({ embeds: [embed] });
    message.channel.send('<@&1405953118658625587>');
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

  // !comopostar
  if (cmdName === 'comopostar') {
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Como Postar')
      .setColor('#4d0070')
      .setDescription(
`<:cam1:1417228632291803298> Pensou em postar uma foto no insta mas não sabe.

Primeiro terá de fazer sua verificação, no canal <#1401686393175937216> tem um explicativo de como ser verificado.

Após estar verificado(a), no canal <#1401686450193563730> mande uma foto ou vídeo com um texto (anexo + legenda).

Caso tenha alguma dúvida pode estar chamando algum cargo alto para lhe explicar direitinho o que deve fazer.

Boas postagens!`)
    .setFooter({ text: 'Ghost Family' });
    message.channel.send({ embeds: [embed] });
    message.channel.send('<@&1401674214779392150>')
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

    // !hierarquia
  if (cmdName === 'hierarquia') {
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Hierarquia')
      .setColor('#4d0070')
      .setDescription(
`<:aviso1:1417223663232749608> Prezados membros da equipe,

A fim de mantermos a organização e incentivarmos o crescimento contínuo da nossa comuniadade, apresentamos a hierarquia da Ghost Family.

<:estrela4:1417222853610438846> <@&1402266968932745246> 
<:invi:1417229096479494279>
<:invi:1417229096479494279> <:seta2:1417223069935734874> <@609911200653770762>
<:invi:1417229096479494279> <:seta2:1417223069935734874> <@1341619672042307640>
<:invi:1417229096479494279> <:seta2:1417223069935734874> <@1135327219024138240>

<:estrela4:1417222853610438846> <@&1405022662413123684>
<:invi:1417229096479494279>
<:invi:1417229096479494279> *Ninguém*

<:estrela4:1417222853610438846> <@&1401666557939159111>
<:invi:1417229096479494279>
<:invi:1417229096479494279> *Ninguém*

<:estrela4:1417222853610438846> <@&1401669976124821666>
<:invi:1417229096479494279>
<:invi:1417229096479494279> *Ninguém*

<:estrela4:1417222853610438846> <@&1402019328282460300>
<:invi:1417229096479494279>
<:invi:1417229096479494279> *Ninguém*

<:estrela4:1417222853610438846> <@&1402163096952377394>
<:invi:1417229096479494279>
<:invi:1417229096479494279> *Ninguém*

<:estrela4:1417222853610438846> <@&1402161136580956264>
<:invi:1417229096479494279>
<:invi:1417229096479494279> <:seta2:1417223069935734874> <@1360769963174138017>

<:estrela4:1417222853610438846> <@&1402155920456286280>
<:invi:1417229096479494279>
<:invi:1417229096479494279> *Ninguém*

Caso tenha alguma dúvida pode estar chamando alguém para lhe ajudar.`)
      .setImage('https://cdn.discordapp.com/attachments/1402307493480108173/1404856567878389760/52_Sem_Titulo_20250812115755.png?ex=689cb622&is=689b64a2&hm=e26b5480cb9ea671a60d6f41b7d764e9088d864235507afe55317cdf552881e7&')
      .setFooter({ text: 'Ghost Family' })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

  // !help
  if (cmdName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('Ghost Family — Comandos')
      .setColor('#4d0070')
.setDescription(
`**Comandos Slash**

*Comandos de moderação:*

*Comandos gerais:*
> /addrole → Adicionar um cargo escolhido em um membro escolhido.
> /removerole → Remover um cargo escolhido de um membro escolhido.
> /permprimeiradama → Adicionar permissão de setar primeira dama em um membro escolhido.
> /addprimeiradama → Colocar cargo de primeira dama em um membro escolhido.
> /removeprimeiradama → Remover o cargo de primeira dama em um membro escolhido.

*Comandos de interação:*
> /sorteio → Escolher tempo, prêmio e número de vencedores e enviar.
> /post → Enviar um post do Instagram.

**Comandos Prefixo**

*Comandos de moderação:*
> !clear → Apagar uma quantidade de mensagens escolhidas em um canal.
> !clearall → Apagar todas as mensagens do canal.
> !lock → Trancar canal.
> !unlock → Destrancar canal.
> !warn → Aplicar um aviso a um membro.
> !warns → Listar avisos de um membro.
> !clearwarns → Remover todos os avisos de um membro.
> !banlist → Listar todos os membros banidos.

*Comandos de ranking:*
> !topmsg → Mostrar o ranking dos membros com mais mensagens.
> !topcall → Mostrar o ranking dos membros com mais tempo em call.
> !resetarmsg → Resetar contagem de mensagens.
> !resetartempo → Resetar tempo em call.

*Comandos de listagem:*
> !listar (id cargo) → Listar e mencionar membros que possuem um cargo específico.

*Comandos embed:*
> !regras → Mandar embed de regras em um canal.
> !regrasrec → Mandar embed de regras de recrutamento.
> !explicativo → Mandar embed de explicativo de verificação.
> !avisourl → Mandar embed de aviso sobre URL.
> !resetaravisosurl → Resetar avisos sobre URL.
> !metasrec → Mandar embed de metas de recrutamento.
> !hierarquiarec → Mandar embed de hierarquia de recrutamento.
> !hierarquia → Mandar embed de hierarquia do servidor.
> !verificacao → Mandar embed de seja influencer.
> !comopostar → Mandar embed de como postar.
> !booster → Mandar embed de booster.

*Comandos gerais:*
> !verificar → Setar cargo de verificado em um membro e enviar mensagem no privado.
> !say → Enviar mensagem customizada pelo bot.
> !serverinfo → Mostrar informações do servidor.
> !info → Mostrar informações de um membro.
> !av → Mostrar avatar de um membro.
> !banner → Mostrar banner de um membro.
> !help → Mostrar lista de comandos.

*Comandos de interação:*
> !hug → Abraçar um membro.
> !kiss → Beijar um membro.
> !bite → Morder um membro.
> !slap → Dar um tapa em um membro.
> !cry → Mostrar que está chorando.`)
      .setImage('https://cdn.discordapp.com/attachments/1402307493480108173/1403888053361184928/barrinha.png?ex=68993022&is=6897dea2&hm=5ff28867a0f91b090496417be32edef90e07af8bb3367968ce5685b814c4aeef&')
      .setFooter({ text: 'Ghost Family' })
      .setTimestamp();

    const helpMsg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => helpMsg.delete().catch(() => {}), 60000);
    message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
  }

// ======/ COMANDOS INTERATIVOSS \======

// == AVATAR ==
if (cmdName === 'av') {
  const membro = message.mentions.members.first() || message.member;
  const avatarURL = membro.user.displayAvatarURL({ size: 1024, dynamic: true });

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setDescription(`### [${membro.user.tag}](${avatarURL})`)
    .setImage(avatarURL);

  sendTempEmbed(message, embed);

  message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
}

// == BANNER ==
if (cmdName === 'banner') {
  const user = message.mentions.users.first() || message.author;
  const fetchUser = await message.client.users.fetch(user.id, { force: true });
  const banner = fetchUser.bannerURL({ size: 1024 });

  if (!banner) return message.reply("Este usuário não tem banner!");

  const embed = new EmbedBuilder()
    .setColor("Aqua")
    .setDescription(`### [${user.tag}](${banner})`)
    .setImage(banner);

  sendTempEmbed(message, embed);

  message.delete().catch(() => {});

      logCommand(message.author, cmdName, message.channel);
}

// == TOPCALL
if (cmdName === 'topcall') {
    const top = Object.entries(userStats)
        .sort((a, b) => (b[1]?.tempoCall || 0) - (a[1]?.tempoCall || 0))
        .slice(0, 10);

    const desc = top.map(([id, stats], index) => 
        `**${index + 1}.** <@${id}> — **${formatTime(stats.tempoCall)}** em call`
    );

    const embed = new EmbedBuilder()
        .setTitle('🎧 Top 10 — Tempo em Call')
        .setColor('Purple')
        .setDescription(desc.join("\n") || "Nenhum dado disponível.")
        .setTimestamp();

    message.delete().catch(() => {});
    const sentMsg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => sentMsg.delete().catch(() => {}), 60000);
    message.delete().catch(() => {});

    await logCommand(message.author, cmdName, message.channel);
}

// == TOPMSG ==
if (cmdName === 'topmsg') {
    const top = Object.entries(userStats)
        .sort((a, b) => (b[1]?.mensagens || 0) - (a[1]?.mensagens || 0))
        .slice(0, 10);

    const desc = top.map(([id, stats], index) => 
        `**${index + 1}.** <@${id}> — **${stats.mensagens}** mensagens`
    );

    const embed = new EmbedBuilder()
        .setTitle('🏆 Top 10 — Mensagens')
        .setColor('Gold')
        .setDescription(desc.join("\n") || "Nenhum dado disponível.")
        .setTimestamp();

    message.delete().catch(() => {});
const sentMsg = await message.channel.send({ embeds: [embed] });
setTimeout(() => sentMsg.delete().catch(() => {}), 10000);
message.delete().catch(() => {});

await logCommand(message.author, cmdName, message.channel);
}

// !hug
if ( cmdName === 'hug') {
  message.delete().catch(() => {});
  const user = message.mentions.users.first();
  if (!user) return message.reply("👤 Mencione alguém para abraçar!").then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));

  const gifs = [
    'https://c.tenor.com/1Zyz6WPCNHkAAAAd/tenor.gif',
    'https://media.tenor.com/vzkveVGDzmAAAAAj/dudu-hug-bubu-dudu-kiss.gif',
    'https://c.tenor.com/9mUQzEnrCEgAAAAd/tenor.gif'
  ];
  const gif = gifs[Math.floor(Math.random() * gifs.length)];

  const embed = new EmbedBuilder()
    .setImage(gif)
    .setColor('#ff6699')
    .setTimestamp();

  const textMsg = await message.channel.send(`${message.author} deu um abraço a ${user}`);
  const sentEmbed = await message.channel.send({ embeds: [embed] });

  setTimeout(() => sentEmbed.delete().catch(() => {}), 120000);
  setTimeout(() => textMsg.delete().catch(() => {}), 120000);

  logCommand(message.author, cmdName, message.channel);
}

// !soco
if ( cmdName === 'slap') {
  message.delete().catch(() => {});
  const user = message.mentions.users.first();
  if (!user) return message.reply("👤 Mencione alguém para socar!").then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));

  const gifs = [
    "https://media.tenor.com/2Q7z7BsuYkAAAAAC/anime-punch.gif",
    "https://media.tenor.com/8GdZ8hdn9ZcAAAAC/punch-anime.gif",
  ];
  const gif = gifs[Math.floor(Math.random() * gifs.length)];

  const embed = new EmbedBuilder()
    .setImage(gif)
    .setColor('#ff0000')
    .setTimestamp();

  const textMsg = await message.channel.send(`${message.author} deu um tapa em ${user}`);
  const sentEmbed = await message.channel.send({ embeds: [embed] });

  setTimeout(() => sentEmbed.delete().catch(() => {}), 120000);
  setTimeout(() => textMsg.delete().catch(() => {}), 120000);

  logCommand(message.author, cmdName, message.channel);
}

// !kiss
if ( cmdName === 'kiss') {
  message.delete().catch(() => {});
  const user = message.mentions.users.first();
  if (!user) return message.reply("👤 Mencione alguém para beijar!").then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));

  const gifs = [
    "https://c.tenor.com/CQP93tMsVfUAAAAd/tenor.gif",
    "https://c.tenor.com/2ES7YijqoOwAAAAd/tenor.gif",
    "https://c.tenor.com/eu29P-pirVkAAAAd/tenor.gif"
  ];
  const gif = gifs[Math.floor(Math.random() * gifs.length)];

  const embed = new EmbedBuilder()
    .setImage(gif)
    .setColor("#ff66cc")
    .setTimestamp();

  const textMsg = await message.channel.send(`${message.author} beijou ${user}`);
  const sentEmbed = await message.channel.send({ embeds: [embed] });

  setTimeout(() => sentEmbed.delete().catch(() => {}), 120000);
  setTimeout(() => textMsg.delete().catch(() => {}), 120000);

  logCommand(message.author, cmdName, message.channel);
}

// == INFO ==
if (cmdName === "info") {
  const user = message.mentions.users.first() || message.author;
  const member = message.guild.members.cache.get(user.id);

  if (!userStats[user.id]) userStats[user.id] = { mensagens: 0, tempoCall: 0, lastJoin: null };

  const mensagens = userStats[user.id].mensagens || 0;
  let tempoCall = userStats[user.id].tempoCall || 0;

  if (userStats[user.id].lastJoin) {
    tempoCall += Date.now() - userStats[user.id].lastJoin;
  }

  const embed = new EmbedBuilder()
    .setColor("#303030")
    .setDescription(
      `${"<:mensagem1:1417226390897688647>"} Você tem **${mensagens}** mensagens no servidor.\n` +
      `${"<:call1:1417227085973291148>"} Você tem **${formatTime(tempoCall)}** em call.`
    );

  const sentMsg = await message.channel.send({ embeds: [embed] });

  message.delete().catch(() => {});
  setTimeout(() => sentMsg.delete().catch(() => {}), 60000);

  logCommand(message.author, cmdName, message.channel);
}

// == SERVERINFO ==
if (cmdName === 'serverinfo') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("❌ Apenas administradores podem usar este comando.")
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
  }

  const { guild } = message;

  const mainEmbed = new EmbedBuilder()
    .setColor("Green")
    .setTitle(`<:estatisticas:1417225057952071813> Estatísticas do Servidor`)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setDescription("Use o menu abaixo para saber as estatísticas do nosso servidor.")
    .addFields(
      { name: "<:categoria1:1417224065890123867>**Categorias**", value: `\`Categotias do servidor.\``},
      { name: "<:canal1:1417225554796478514> **Canais**", value: `\`Canais do servidor.\``},
      { name: "<:cargo3:1417226979031122033> **Cargos**", value: `\`Cargos do servidor.\``},
      { name: "<:Membro:1417224284128022598> **Membros**", value: `\`Membros do servidor.\``},
      { name: "<:booster1:1417226595005108316> **Boosts**", value: `\`Boosts do servidor.\``}
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("serverinfo_menu")
    .setPlaceholder("Selecione uma opção")
    .addOptions([
      { label: "Categorias", value: "categorias", emoji: "<:categoria:1415834010604535890>" },
      { label: "Canais", value: "canais", emoji: "<:canal1:1417225554796478514>" },
      { label: "Cargos", value: "cargos", emoji: "<:cargo3:1417226979031122033>" },
      { label: "Membros", value: "membros", emoji: "<:Membro:1417224284128022598>" },
      { label: "Boosts", value: "boosts", emoji: "<:booster1:1417226595005108316>" }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  const msg = await message.channel.send({ embeds: [mainEmbed], components: [row] });

  // Apaga a mensagem do usuário
  message.delete().catch(() => {});

  const collector = msg.createMessageComponentCollector({
    componentType: 3,
    time: 90000
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({ content: "❌ Apenas quem executou o comando pode usar o menu.", flags: MessageFlags.Ephemeral });
    }

    let embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`<:estatisticas:1417225057952071813> Estatísticas do Servidor`)
      .setThumbnail(guild.iconURL({ dynamic: true }));

    switch (interaction.values[0]) {
case "categorias":
  embed.setDescription(
    `<:categoria1:1417224065890123867>**Categorias:** ${guild.channels.cache.filter(c => c.type === 4).size}`
  );
  break;

      case "canais":
        embed.setDescription(
          `<:mensagem1:1417226390897688647> **Canais de texto:** ${guild.channels.cache.filter(c => c.type === 0).size}\n` +
          `<:call1:1417227085973291148> **Canais de voz:** ${guild.channels.cache.filter(c => c.type === 2).size}`
        );
        break;

       case "cargos":
  const cargosOrdenados = guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .map(r => `- <@&${r.id}>`)
    .join("\n");

  embed.setDescription(
    `<:cargo3:1417226979031122033> O servidor possui **${guild.roles.cache.size} cargos**:\n\n${cargosOrdenados}`
  );
       break;

case "membros": {
  await guild.members.fetch();

  const total = guild.memberCount;
  const humanos = guild.members.cache.filter(m => !m.user.bot).size;
  const bots = guild.members.cache.filter(m => m.user.bot).size;

  embed.setDescription(
    `<:Membros:1417224406656356402> Total de membros: **${total}**\n` +
    `<:Membro:1417224284128022598> Membros: **${humanos}**\n` +
    `<:robot1:1417223992468832266> Bots: **${bots}**`
  );
  break;
}

      case "boosts":
        embed.setDescription(
          `<:sorteio2:1417226509176934450> Nível de boost: **${guild.premiumTier}**\n` +
          `<:booster1:1417226595005108316> Número de boosts: **${guild.premiumSubscriptionCount || 0}**`
        );
        break;
    }

    await interaction.update({ embeds: [embed], components: [row] });
  });

  collector.on("end", () => {
    msg.delete().catch(() => {});
  });

      logCommand(message.author, cmdName, message.channel);
}

// ======/ COMANDOS WARN \======

// == WARN ==
if (cmdName === 'warn') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para usar este comando.');
    }

    const alvo = message.mentions.members.first();
    if (!alvo) return message.reply('<:alerta1:1417223948554473642> Mencione um usuário para dar warn.');
    const motivo = args.slice(1).join(' ') || 'Sem motivo especificado';

    if (!warns[alvo.id]) warns[alvo.id] = [];
const expiraEm = Date.now() + WARN_DIAS_EXPIRA * 24 * 60 * 60 * 1000;

warns[alvo.id].push({
    autor: message.author.tag,
    motivo: motivo,
    data: new Date().toLocaleString(), 
    expira: expiraEm
});

    saveWarns();

    const totalWarns = warns[alvo.id].length;

    const embed = new EmbedBuilder()
        .setTitle('<:alerta2:1417224508099661854> Novo Warn Aplicado')
        .setColor(totalWarns >= 3 ? 'Red' : 'Yellow')
        .addFields(
            { name: '<:Membro:1417224284128022598> *Membro**', value: `${alvo} | ${alvo.id}`, inline: false },
            { name: '<:staff1:1417226645114191913> **Autor**', value: `${message.author}`, inline: false },
            { name: '<:Motivo1:1417225384067338310> **Motivo**', value: `\`${motivo}\``, inline: false },
            { name: '<:calendario2:1417224912044560384> **Data**', value: new Date().toLocaleString(), inline: false },
            { name: '<:tempo1:1417224463178530947> Expira', value: new Date(expiraEm).toLocaleString(), inline: false },
            { name: '<:status3:1417225436903116871> Total de Warns', value: `${totalWarns}`, inline: true }
        )
        .setThumbnail(alvo.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1405673526257516614.png" })
        .setTimestamp();

    // Envia no canal onde o comando foi executado
    await message.channel.send({ embeds: [embed] });
    message.delete().catch(() => {});

    // Envia no canal de logs
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel && logChannel.isTextBased()) logChannel.send({ embeds: [embed] });

    // Tenta enviar no privado do usuário
    try {
        await alvo.send({ embeds: [embed] });
    } catch {
        message.channel.send(`<:alerta1:1417223948554473642> Não consegui enviar a mensagem no privado para ${alvo.user.tag}.`);
    }

    // Gerenciar cargos de warn
    const warnRoles = {
        1: '1404215113501642762', // WARN I
        2: '1404215123354194092', // WARN II
        3: '1404215126462038036'  // WARN III
    };

    // Remove cargos antigos de warn
    Object.values(warnRoles).forEach(roleId => {
        if (alvo.roles.cache.has(roleId)) alvo.roles.remove(roleId).catch(() => {});
    });

    // Adiciona cargo correspondente
    if (warnRoles[totalWarns]) {
        const cargo = message.guild.roles.cache.get(warnRoles[totalWarns]);
        if (cargo) {
            alvo.roles.add(cargo).catch(() => {});
        }
    }

    // Ban automático no 3º warn
    if (totalWarns >= 3) {
        try {
            await alvo.ban({ reason: `Acumulou ${totalWarns} warns.` });

            const banEmbed = new EmbedBuilder()
                .setTitle('⛔ Membro Banido')
                .setColor('Red')
                .addFields(
                    { name: '<:Membro:1417224284128022598> **Membro**', value: `${alvo.user.tag} (${alvo.id})`, inline: false },
                    { name: '<:Motivo1:1417225384067338310> **Motivo**', value: `Acumulou ${totalWarns} warns.`, inline: false },
                    { name: '<:staff1:1417226645114191913> **Autor do último warn**', value: `${message.author.tag}`, inline: false }
                )
                .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1405673526257516614.png" })
                .setTimestamp();

            if (logChannel && logChannel.isTextBased()) logChannel.send({ embeds: [banEmbed] });

            try {
                await alvo.send({ embeds: [banEmbed] });
            } catch {
                message.channel.send(`<:alerta1:1417223948554473642> Não consegui enviar o aviso de ban no privado para ${alvo.user.tag}.`);
            }

        } catch (err) {
            console.error(`Erro ao banir ${alvo.user.tag}:`, err);
            message.channel.send(`<:alerta1:1417223948554473642> Não consegui banir ${alvo.user.tag}.`);
        }
    }

    logCommand(message.author, cmdName, message.channel);
}

// == CLEARWARNS ==
if (cmdName === 'clearwarns') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para usar este comando.');
    }

    const alvo = message.mentions.members.first();
    if (!alvo) return message.reply('<:alerta1:1417223948554473642> Mencione um usuário.');

    const total = warns[alvo.id]?.length || 0;
    warns[alvo.id] = [];
    saveWarns();

    message.channel.send(`✅ Todos os warns de ${alvo.user.tag} foram removidos.`);

    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel && logChannel.isTextBased()) {
        const embed = new EmbedBuilder()
            .setTitle('🗑 Warns Removidos')
            .setColor('Green')
            .addFields(
                { name: '<:Membro:1417224284128022598> **Membro**', value: `${alvo} | ${alvo.id}`, inline: false },
                { name: '<:staff1:1417226645114191913> **Autor**', value: `${message.author}`, inline: false },
                { name: '<:status2:1417225017359339731> **Quantidade Removida**', value: `${total}`, inline: false }
            )
            .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1405673526257516614.png" })
            .setTimestamp();
        logChannel.send({ embeds: [embed] });
    }
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == WARNS ==
if (cmdName === 'warns') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para usar este comando.');
    }

    const alvo = message.mentions.members.first();
    if (!alvo) return message.reply('<:alerta1:1417223948554473642> Mencione um usuário.');

    const lista = warns[alvo.id];
    if (!lista || lista.length === 0) return message.reply('✅ Este usuário não possui warns.');

    const embed = new EmbedBuilder()
        .setTitle(`<:alerta2:1417224508099661854> Warns de ${alvo.user.tag}`)
        .setColor('Orange')
        .setDescription(lista.map((w, i) => 
        `**${i + 1}.** ${w.motivo} - por ${w.autor} em ${w.data} (Expira: ${w.expira ? new Date(w.expira).toLocaleString() : 'Não definido'})`
        ).join('\n'))
        .setFooter({ text: `Total de warns: ${lista.length}` })
        .setTimestamp();

    message.channel.send({ embeds: [embed] });
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == WARNLIST ==
if (cmdName === 'warnlist') {
    let lista = [];
    for (const [id, warnsUser] of Object.entries(warns)) {
        warnsUser.forEach(w => {
            lista.push(`**${message.guild.members.cache.get(id)?.user.tag || id}** → ${w.motivo} (por ${w.autor}) (expira: ${w.expira ? new Date(w.expira).toLocaleString() : 'Não definido'})`);
        });
    }
    if (!lista.length) return message.reply("✅ Nenhum warn no servidor.");

    const embed = new EmbedBuilder()
        .setTitle("<:alerta2:1417224508099661854> Warns do Servidor")
        .setDescription(lista.slice(0, 4096).join("\n"))
        .setColor("Red");

    const sentMsg = await message.channel.send({ embeds: [embed] });
setTimeout(() => sentMsg.delete().catch(() => {}), 12000);
message.delete().catch(() => {});

logCommand(message.author, cmdName, message.channel);
}

// ======/ COMANDOS ADMNISTRADOR \======

  if (cmdName === 'verificar') {
  const membro = message.mentions.members.first();
  const cargo = message.guild.roles.cache.get('1402651613331587143');

  if (!membro) {
    return message.reply('<:alerta1:1417223948554473642> Você precisa mencionar um membro.');
  }

  if (!cargo) {
    return message.reply('<:alerta1:1417223948554473642> Cargo de verificado não encontrado.');
  }

  try {
    await membro.roles.add(cargo);

    const embed = new EmbedBuilder()
      .setTitle('**Verificação Concluída!**')
      .setDescription(
        "**Parabéns! Você foi verificado com sucesso no servidor Ghost Family.**\n\n" +
        "Agora você pode:\n" +
        "<:cam1:1417228632291803298> Criar posts\n" +
        "<:verificacao1:1417226739725107220> Aproveitar a comunidade!"
      )
      .setColor('#2f3136')
      .setFooter({ text: 'Ghost Family' })

    try {
      await membro.send({ embeds: [embed] });
    } catch {
      await message.channel.send('⚠️ O membro foi verificado, mas está com DMs fechadas.');
    }

    const verificarMsg = await message.reply(`<:verificacao1:1417226739725107220> <@${membro.user.id}> foi verificado com sucesso!`);
    setTimeout(() => verificarMsg.delete().catch(() => {}), 30000);
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);

  } catch (err) {
    console.error('Erro ao verificar membro:', err);
    await message.reply('❌ Ocorreu um erro ao tentar verificar esse usuário.');
  }
}

// == BANLIST ==
if (cmdName === 'banlist') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para usar este comando.');
    }

    try {
        const bans = await message.guild.bans.fetch();
        if (!bans.size) return message.reply('✅ Nenhum usuário banido no momento.');

        const lista = bans.map(b => `**${b.user.tag}** | \`${b.user.id}\` \n<:invi:1417229096479494279><:direita2:1417224696042229952> ${b.reason || 'Sem motivo'} \n <:invi:1417229096479494279>`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`<:alerta2:1417224508099661854> Lista de Banidos (${bans.size})`)
            .setDescription(lista.slice(0, 4096))
            .setColor('Red')
            .setTimestamp();

        const banlistMsg = await message.channel.send({ embeds: [embed] });

        setTimeout(() => banlistMsg.delete().catch(() => {}), 120000);
        message.delete().catch(() => {});

        logCommand(message.author, cmdName, message.channel);
        
    } catch (err) {
        console.error('Erro ao buscar banlist:', err);
        message.reply('<:alerta1:1417223948554473642> Não consegui buscar a lista de banidos.');
    }
}

// == LOCKALL ==
if (cmdName === 'lockall') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para trancar canais.');
    }

    message.guild.channels.cache
        .filter(ch => ch.isTextBased())
        .forEach(ch => {
            ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false })
              .catch(() => {});
        });

    message.reply('🔒 Todos os canais de texto foram trancados!');
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == UNLOCKALL ==
if (cmdName === 'unlockall') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para destrancar canais.');
    }

    message.guild.channels.cache
        .filter(ch => ch.isTextBased())
        .forEach(ch => {
            ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true })
              .catch(() => {});
        });

    message.reply('🔓 Todos os canais de texto foram destrancados!');
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == TEMPROLE ==
if (cmdName === 'temprole') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para gerenciar cargos.');
    }

    const membro = message.mentions.members.first();
    const cargo = message.mentions.roles.first();
    const tempo = args[2]; // Ex: 10m, 1h, 2d
    if (!membro || !cargo || !tempo) {
        return message.reply('<:alerta1:1417223948554473642> Use: `!temprole @membro @cargo <tempo>` (ex: !temprole @user @cargo 10m)');
    }

    if (!ms(tempo)) {
        return message.reply('<:alerta1:1417223948554473642> Tempo inválido. Use exemplo: `10m`, `1h`, `2d`.');
    }

    try {
        await membro.roles.add(cargo);
        message.channel.send(`✅ Cargo **${cargo.name}** adicionado a ${membro.user.tag} por ${tempo}.`);

        setTimeout(async () => {
            if (membro.roles.cache.has(cargo.id)) {
                await membro.roles.remove(cargo).catch(() => {});
                message.channel.send(`⌛ Tempo expirado! Cargo **${cargo.name}** removido de ${membro.user.tag}.`);
            }
        }, ms(tempo));

    } catch (err) {
        console.error(err);
        message.reply('<:alerta1:1417223948554473642> Não consegui adicionar o cargo.');
    }
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == RESETARMSG ==
if (cmdName === 'resetarmsg') {
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('<:alerta1:1417223948554473642> Você não tem permissão para usar este comando.');
  }

  Object.keys(userStats).forEach(userId => {
    userStats[userId].mensagens = 0;
  });

  saveStats();
  message.reply('✅ Todas as mensagens foram resetadas.');
  message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == RESETARTEMPO ==
if (cmdName === 'resetartempo') {
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Você não tem permissão para usar este comando.');
  }

  Object.keys(userStats).forEach(userId => {
    userStats[userId].tempoCall = 0;
    userStats[userId].lastJoin = null;
  });

  saveStats();
  message.reply('✅ Todo o tempo em call foi resetado.');
  message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == PRIVCANAL ==
if (cmdName === "privcanal") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ Você não tem permissão para gerenciar canais.")
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
  }

  if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("⚠️ Eu não tenho permissão para gerenciar canais.");
  }

  const canal = message.channel;
  try {
    // Bloqueia acesso para @everyone
    await canal.permissionOverwrites.set([
      {
        id: message.guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      // Permite acesso a todos os cargos com permissão de Administrador
      ...message.guild.roles.cache
        .filter(role => role.permissions.has(PermissionsBitField.Flags.Administrator) && role.id !== message.guild.id)
        .map(role => ({
          id: role.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
        }))
    ]);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("<:priv1:1417225300693094532> Canal privado")
      .setDescription(`O canal ${canal} agora está **visível apenas para administradores**.`)
      .setTimestamp();

    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 20000);

    message.delete().catch(() => {});
    logCommand(message.author, cmdName, message.channel);
  } catch (err) {
    console.error(err);
    message.reply("❌ Ocorreu um erro ao tentar tornar o canal privado.");
  }
}

// == PUBCANAL ==
if (cmdName === "pubcanal") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ Você não tem permissão para gerenciar canais.")
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
  }

  if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("⚠️ Eu não tenho permissão para gerenciar canais.");
  }

  const canal = message.channel;
  try {
    await canal.permissionOverwrites.set([
      {
        id: message.guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: "1401674214779392150",
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ],
      }
    ]);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("<:pub1:1417225339163250851> Canal público para cargo específico")
      .setDescription(`O canal ${canal} agora está visível apenas para <@&1401674214779392150>.`)
      .setTimestamp();

    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 20000);

    message.delete().catch(() => {});
    logCommand(message.author, cmdName, message.channel);
  } catch (err) {
    console.error(err);
    message.reply("❌ Erro ao tentar tornar o canal público para o cargo.");
  }
}

// == LOCK ==
if (cmdName === "lock") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ Você não tem permissão para usar este comando.")
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
  }

  if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("⚠️ Eu não tenho permissão para trancar canais.");
  }

  await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    SendMessages: false
  });

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("<:lock2:1417225925799706644> Canal trancado")
    .setDescription(`Este canal foi **trancado** por ${message.author}`)
    .setTimestamp();

  const msg = await message.channel.send({ embeds: [embed] });
  setTimeout(() => msg.delete().catch(() => {}), 20000);

  message.delete().catch(() => {});

  logCommand(message.author, cmdName, message.channel);
}

// == UNLOCK ==
if (cmdName === "unlock") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ Você não tem permissão para usar este comando.")
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
  }

  if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("⚠️ Eu não tenho permissão para destrancar canais.");
  }

  await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    SendMessages: true
  });

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("<:lock1:1417225833155924019> Canal destrancado")
    .setDescription(`Este canal foi **destrancado** por ${message.author}`)
    .setTimestamp();

  const msg = await message.channel.send({ embeds: [embed] });
  setTimeout(() => msg.delete().catch(() => {}), 20000);

  message.delete().catch(() => {});

  logCommand(message.author, cmdName, message.channel);
}

// == AVISOURL ==
if  (cmdName === "avisourl") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send("❌ Você não tem permissão para usar este comando.");
  }

  const membro = message.mentions.members.first();
  if (!membro) {
    return message.channel.send("⚠️ Você precisa mencionar alguém para enviar o aviso.");
  }

  // Atualiza contador
  const avisos = (avisosUrl[membro.id] || 0) + 1;
  avisosUrl[membro.id] = avisos;
  salvarAvisos(); // salva no arquivo

  // Embed do aviso para o usuário
  const embedAviso = new EmbedBuilder()
    .setTitle("<:sino1:1417240109262311486> Aviso Importante")
    .setColor('#ff0000')
    .setDescription(
      "Opa, tudo bom? Observamos seu perfil e vimos que está na **Ghost Family** e não está usando `/Ghost`.\n\n" +
      "ㅤ\n" +
      "Esta mensagem é apenas um aviso, mas caso não coloque o `/Ghost` na sua bio, você será expulso(a) da nossa família!"
    )
    .setFooter({ text: "Ghost Family" })
    .setTimestamp();

  try {
    await membro.send({ embeds: [embedAviso] });
    await message.channel.send(`✅ Aviso enviado para <@${membro.user.id}>`);
  } catch (err) {
    console.error("Erro ao enviar DM:", err);
    await message.channel.send("❌ Não foi possível enviar DM para este usuário.");
  }

  // Log em embed
  const logChannel = message.guild.channels.cache.get(logChannels.avisosurl);
  if (logChannel && logChannel.isTextBased()) {
    const embedLog = new EmbedBuilder()
      .setTitle("📢 Aviso de URL enviado")
      .setColor("Purple")
      .addFields(
        { name: "<:Membro:1417224284128022598> **Membro**", value: `${membro.user} \`${membro.user.id}\``, inline: false },
        { name: "<:staff1:1417226645114191913> **Autor**", value: `${message.author} \`${message.author.id}\``, inline: false },
        { name: "<:status3:1417225436903116871> **Total de avisos*", value: `${avisos}`, inline: false }
      )
      .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1405673526257516614.png" })
      .setTimestamp();
    logChannel.send({ embeds: [embedLog] }).catch(console.error);
  }
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == RESETARAVISOURL ==
if (cmdName === "resetaravisosurl") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send("<:alerta1:1417223948554473642> Você não tem permissão para usar este comando.");
  }

  const membro = message.mentions.members.first();
  if (!membro) {
    return message.channel.send("<:alerta1:1417223948554473642> Você precisa mencionar alguém para resetar os avisos.");
  }

  delete avisosUrl[membro.id];
  salvarAvisos(); // salva no arquivo
  await message.channel.send(`✅ Avisos de URL para <@${membro.user.id}> foram resetados.`);

  // Log em embed
  const logChannel = message.guild.channels.cache.get(logChannels.avisosurl);
  if (logChannel && logChannel.isTextBased()) {
    const embedReset = new EmbedBuilder()
      .setTitle("♻️ Avisos de URL resetados")
      .setColor("Green")
      .addFields(
        { name: "<:Membro:1417224284128022598> **Membro**", value: `${membro.user} \`${membro.user.id}\``, inline: false },
        { name: "<:staff1:1417226645114191913> **Autor**", value: `${message.author} \`${message.author.id}\``, inline: false }
      )
      .setTimestamp();
    logChannel.send({ embeds: [embedReset] }).catch(console.error);
  }
    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);
}

// == CLEAR ==
if (cmdName === 'clear') {
  const amount = parseInt(args[0]);

  if (!message.member.permissions.has('ManageMessages')) 
    return message.reply("❌ Você não tem permissão para apagar mensagens.");

  if (!message.guild.members.me.permissions.has('ManageMessages')) 
    return message.reply("❌ Eu não tenho permissão para apagar mensagens.");
  
  if (!amount || isNaN(amount) || amount < 1 || amount > 100) 
    return message.reply("❌ Use: `!clear <número de 1 a 100>`");

  try {
    // Apaga a mensagem do comando
    await message.delete().catch(() => {});

    // Apaga apenas a quantidade pedida
    await message.channel.bulkDelete(amount, true);

    const msg = await message.channel.send(`<:alerta1:1417223948554473642> ${amount} mensagens apagadas!`);
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error("Erro ao apagar mensagens:", err.message);
    await message.channel.send("⚠️ Não consegui apagar todas as mensagens (apenas mensagens com menos de 14 dias podem ser deletadas).");
  }
  message.delete().catch(() => {});

  logCommand(message.author, cmdName, message.channel);
}

// == CLEARALL ==
if (cmdName === 'clearall') {
  if (!message.member.permissions.has('ManageMessages')) 
    return message.reply("❌ Você não tem permissão para apagar mensagens.");

  if (!message.guild.members.me.permissions.has('ManageMessages')) 
    return message.reply("❌ Eu não tenho permissão para apagar mensagens.");

  try {
    let fetched;
    let totalDeleted = 0;

    do {
      // Busca até 100 mensagens
      fetched = await message.channel.messages.fetch({ limit: 100 });

      // Filtra mensagens com menos de 14 dias
      const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 14 * 24 * 60 * 60 * 1000);

      if (deletable.size > 0) {
        const deleted = await message.channel.bulkDelete(deletable, true).catch(() => {});
        totalDeleted += deleted.size;
      }

    } while (fetched.size === 100); // para quando tiver menos que 100

    const msg = await message.channel.send(`<:alerta1:1417223948554473642> ${totalDeleted} mensagens apagadas!`);
    setTimeout(() => msg.delete().catch(() => {}), 5000);

    message.delete().catch(() => {});

    logCommand(message.author, cmdName, message.channel);

  } catch (err) {
    console.error("Erro no clearall:", err);
    message.channel.send("⚠️ Não consegui apagar todas as mensagens (apenas mensagens com menos de 14 dias podem ser deletadas).");
  }
}

// == SAY ==
if (cmdName === 'say') {
  if (!message.member.permissions.has('Administrator')) {
    return message.reply("❌ Você precisa ser administrador para usar este comando!");
  }

  const texto = args.join(" ");
  if (!texto) return message.reply("Digite algo para eu repetir!");

  message.channel.send(texto);

  message.delete().catch(() => {});

  logCommand(message.author, cmdName, message.channel);
}
});

// ====== SISTEMA POSTS ======
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const postChannels = ["1401686450193563730"];
  if (!postChannels.includes(message.channel.id)) return;
  if (!message.attachments.size) return;

  // Se não tiver legenda, só apaga a mensagem e não faz post
  if (!message.content) {
    await message.delete().catch(() => {});
    return;
  }

  // helper para baixar buffer (segue redirects)
  const https = require('https');
  async function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        // follow redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(downloadBuffer(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download. Status ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
    });
  }

  const post = {
    likes: [],
    comments: []
  };

  // Cria botões (igual ao seu original)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("like")
      .setLabel(`${post.likes.length}`)
      .setEmoji("<:coracao:1417240582413095033>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("view_likes")
      .setEmoji("<:caracoes:1417240544081608807>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("comment")
      .setLabel(`${post.comments.length}`)
      .setEmoji("<:comentario:1417240512695504966>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("view_comments")
      .setEmoji("<:comentarios:1417240485780656239>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("delete_post")
      .setEmoji("<:lixo:1417240446505193553>")
      .setStyle(ButtonStyle.Secondary)
  );

  // Baixa anexos e monta AttachmentBuilder com Buffer + name
  const attachments = [];
  for (const attachment of message.attachments.values()) {
    try {
      const buffer = await downloadBuffer(attachment.url);
      const filename = attachment.name || `file-${Date.now()}`;
      attachments.push(new AttachmentBuilder(buffer, { name: filename }));
    } catch (err) {
      console.error(`Erro ao baixar anexo ${attachment.url}:`, err);
      // se falhar, continuamos sem esse arquivo (fallback será feito a seguir)
    }
  }

  // Montar o conteúdo da mensagem: menção + legenda
  const content = `${message.author}\n> ${message.content}`;

  // Deleta a mensagem original (após já termos os buffers) para evitar race
  await message.delete().catch(() => {});

  let postMsg;
  try {
    if (attachments.length > 0) {
      // envia com arquivos (melhor compatibilidade)
      postMsg = await message.channel.send({
        content,
        files: attachments,
        components: [row]
      });
    } else {
      // fallback: se não conseguimos baixar os buffers, enviamos as imagens via embed apontando para as URLs originais
      const embeds = [];
      for (const att of message.attachments.values()) {
        const e = new EmbedBuilder()
          .setImage(att.url)
          .setDescription(`Arquivo: \`${att.name || att.id}\``);
        embeds.push(e);
      }
      postMsg = await message.channel.send({
        content,
        embeds,
        components: [row]
      });
    }
  } catch (err) {
    console.error("Erro ao enviar post:", err);
    // tenta enviar ao menos o texto com componentes (sem arquivos)
    try {
      postMsg = await message.channel.send({ content, components: [row] });
    } catch (err2) {
      console.error("Erro ao enviar fallback do post:", err2);
      return;
    }
  }

  // Salvar dados do post (mantém as urls originais para referência)
  postsData[postMsg.id] = {
    id: postMsg.id,
    channelId: postMsg.channel.id,
    guildId: postMsg.guild.id,
    authorId: message.author.id,
    legenda: message.content,
    anexos: message.attachments.map(a => a.url),
    likes: [],
    comments: [],
    createdAt: Date.now()
  };

  savePosts();
});

// ====== SISTEMA POSTS ======
// Função para atualizar os botões do post com os contadores atuais
async function updatePostButtons(message, post) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("like")
      .setLabel(`${post.likes.length}`)
      .setEmoji("<:coracao:1417240582413095033>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("view_likes")
      .setEmoji("<:caracoes:1417240544081608807>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("comment")
      .setLabel(`${post.comments.length}`)
      .setEmoji("<:comentario:1417240512695504966>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("view_comments")
      .setEmoji("<:comentarios:1417240485780656239>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("delete_post")
      .setEmoji("<:lixo:1417240446505193553>")
      .setStyle(ButtonStyle.Secondary)
  );
  try {
    await message.edit({ components: [row] });
  } catch (e) {
    // Mensagem pode já ter sido deletada
  }
}

// ------------------ INTERAÇÕES COM POSTS ------------------
client.on(Events.InteractionCreate, async interaction => {
  // ------------------ BOTÕES ------------------
  if (interaction.isButton()) {
    const postId = interaction.message.id;
    const post = postsData[postId];

    if (!post) {
      return interaction.reply({
        content: '<:aviso1:1414053706542088213> Post não encontrado.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Garante que os arrays existam
    if (!Array.isArray(post.likes)) post.likes = [];
    if (!Array.isArray(post.comments)) post.comments = [];

    // Curtir
    if (interaction.customId === 'like') {
      if (post.likes.includes(interaction.user.id)) {
        return interaction.reply({
          content: '<:aviso1:1414053706542088213> Você já curtiu este post.',
          flags: MessageFlags.Ephemeral
        });
      }

      post.likes.push(interaction.user.id);
      savePosts();
      await updatePostButtons(interaction.message, post); // Atualiza botões!

      return interaction.reply({
        content: `<:coracao:1417240582413095033> Você curtiu este post!`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Comentar
    if (interaction.customId === 'comment') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_comment_${postId}`)
        .setTitle('Adicionar Comentário');

      const input = new TextInputBuilder()
        .setCustomId('comment_text')
        .setLabel('Comentário')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // Ver curtidas
    if (interaction.customId === 'view_likes') {
      const likeList = post.likes.length
        ? post.likes.map(uid => `<@${uid}>`).join('\n')
        : 'Nenhuma curtida.';

      return interaction.reply({
        content: `<:caracoes:1417240544081608807> Curtidas:\n${likeList}`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Ver comentários
    if (interaction.customId === 'view_comments') {
      const commentsList = post.comments.length
        ? post.comments.map(c => `• <@${c.userId}>: ${c.text ?? ''}`).join('\n')
        : 'Nenhum comentário.';

      return interaction.reply({
        content: `<:comentarios:1417240485780656239> Comentários:\n${commentsList}`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Deletar post
    if (interaction.customId === 'delete_post') {
      if (
        interaction.user.id !== post.authorId &&
        !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
      ) {
        return interaction.reply({
          content: '<:aviso1:1414053706542088213> Você não pode apagar este post.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.message.delete().catch(() => {});
      delete postsData[postId];
      savePosts();

      return interaction.reply({
        content: '<:lixo:1417240446505193553> Post apagado.',
        flags: MessageFlags.Ephemeral
      });
    }
  }

  // ------------------ MODAL DE COMENTÁRIO ------------------
  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_comment_')) {
    const postId = interaction.customId.replace('modal_comment_', '');
    const post = postsData[postId];

    if (!post) {
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: '<:aviso1:1414053706542088213> Post não encontrado.',
            flags: MessageFlags.Ephemeral
          });
        } catch (err) {
          console.error('Falha ao responder interação (post não encontrado):', err);
        }
      }
      return;
    }

    if (!Array.isArray(post.comments)) post.comments = [];

    // Garante que sempre seja string
    const comment = String(interaction.fields.getTextInputValue('comment_text') || '');
    post.comments.push({ userId: interaction.user.id, text: comment });
    savePosts();
    await updatePostButtons(interaction.message, post); // Atualiza botões!

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '<:comentario:1417240512695504966> Comentário adicionado!',
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        console.error('Falha ao responder interação (comentário):', err);
      }
    }
    return;
  }
});

// COMANDOS SLASH
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const cmdName = interaction.commandName;
  const options = interaction.options;

  try {
    switch (cmdName) {
      case "addrole": {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
          return interaction.editReply({ content: "🚫 Sem permissão." });

        const memberToAdd = options.getMember("usuario");
        const roleToAdd = options.getRole("cargo");
        if (!memberToAdd || !roleToAdd)
          return interaction.editReply({ content: "❌ Usuário ou cargo inválido." });

        await memberToAdd.roles.add(roleToAdd);
        await interaction.editReply({ content: `✅ Cargo ${roleToAdd.name} adicionado a ${memberToAdd}.` });
        break;
      }

      case "removerole": {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
          return interaction.editReply({ content: "🚫 Sem permissão." });

        const memberToRemove = options.getMember("usuario");
        const roleToRemove = options.getRole("cargo");
        if (!memberToRemove || !roleToRemove)
          return interaction.editReply({ content: "❌ Usuário ou cargo inválido." });

        await memberToRemove.roles.remove(roleToRemove);
        await interaction.editReply({ content: `❌ Cargo ${roleToRemove.name} removido de ${memberToRemove}.` });
        break;
      }

      case "addprimeiradama": {
        const member = options.getMember("usuario");
        if (!member) return interaction.reply({ content: "❌ Membro não encontrado.", ephemeral: true });

        const firstLadyRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "first lady");
        const managerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "/perm");
        if (!firstLadyRole || !managerRole)
          return interaction.reply({ content: "❌ Cargos 'First Lady' ou '/perm' não encontrados.", ephemeral: true });

        if (!interaction.member.roles.cache.has(managerRole.id))
          return interaction.reply({ content: "🚫 Você não tem permissão para adicionar esse cargo.", ephemeral: true });

        if (member.roles.cache.has(firstLadyRole.id))
          return interaction.reply({ content: "Este membro já possui o cargo First Lady.", ephemeral: true });

        await member.roles.add(firstLadyRole);
        interaction.reply({ content: `👑 ${member} agora é **First Lady**!` });
        break;
      }

      case "removeprimeiradama": {
        const member = options.getMember("usuario");
        if (!member) return interaction.reply({ content: "❌ Membro não encontrado.", ephemeral: true });

        const firstLadyRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "first lady");
        const managerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "/perm");
        if (!firstLadyRole || !managerRole)
          return interaction.reply({ content: "❌ Cargos 'First Lady' ou '/perm' não encontrados.", ephemeral: true });

        if (!interaction.member.roles.cache.has(managerRole.id))
          return interaction.reply({ content: "🚫 Você não tem permissão para remover esse cargo.", ephemeral: true });

        if (!member.roles.cache.has(firstLadyRole.id))
          return interaction.reply({ content: "Este membro não possui o cargo First Lady.", ephemeral: true });

        await member.roles.remove(firstLadyRole);
        interaction.reply({ content: `❌ ${member} deixou de ser **First Lady**.` });
        break;
      }

      case "permprimeiradama": {
        const member = options.getMember("usuario");
        if (!member) return interaction.reply({ content: "❌ Membro não encontrado.", ephemeral: true });

        const managerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "/perm");
        if (!managerRole) return interaction.reply({ content: "❌ Cargo '/perm' não encontrado.", ephemeral: true });

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
          return interaction.reply({ content: "🚫 Você não tem permissão para gerenciar esse cargo.", ephemeral: true });

        if (member.roles.cache.has(managerRole.id)) {
          await member.roles.remove(managerRole);
          interaction.reply({ content: `❌ Cargo '/perm' removido de ${member}.` });
        } else {
          await member.roles.add(managerRole);
          interaction.reply({ content: `✅ Cargo '/perm' concedido a ${member}.` });
        }
        break;
      }

      case "sorteio": {
        await interaction.deferReply({ ephemeral: true });

        const tempoStr = options.getString("tempo"); // ex: 10m, 1h
        const premio = options.getString("premio");
        const vencedoresQtd = options.getInteger("vencedores") || 1;

        const duracao = ms(tempoStr);
        if (!duracao)
          return interaction.editReply({ content: "⏳ Tempo inválido. Use algo como `10m`, `1h`, `2d`." });
        if (!premio)
          return interaction.editReply({ content: "🎁 Você precisa definir um prêmio." });
        if (vencedoresQtd < 1)
          return interaction.editReply({ content: "👥 Número de vencedores inválido." });

        function embaralhar(array) {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        }

        const embed = new EmbedBuilder()
          .setTitle("🎉 SORTEIO 🎉")
          .setDescription(`**Prêmio:** ${premio}\n**Vencedores:** ${vencedoresQtd}\n\nReaja com 🎉 para participar!`)
          .setColor("Gold")
          .setFooter({ text: `Termina em ${tempoStr}` })
          .setTimestamp(Date.now() + duracao);

        const sorteioMsg = await interaction.channel.send({ embeds: [embed] });
        await sorteioMsg.react("🎉");

        await interaction.editReply({ content: "✅ Sorteio iniciado com sucesso!" });

        setTimeout(async () => {
          const atualizado = await sorteioMsg.fetch();
          const reacao = atualizado.reactions.cache.get("🎉");
          if (!reacao) return interaction.channel.send("❌ Ninguém participou do sorteio.");

          let participantes = (await reacao.users.fetch())
            .filter(u => !u.bot)
            .map(u => u);

          if (participantes.length < vencedoresQtd) {
            return interaction.channel.send("⚠️ Participantes insuficientes para o sorteio.");
          }

          participantes = embaralhar(participantes);
          const ganhadores = participantes.slice(0, vencedoresQtd);

          const resultadoEmbed = new EmbedBuilder()
            .setTitle("🏆 Resultado do Sorteio")
            .setDescription(
              `**Prêmio:** ${premio}\n🎉 **Ganhador(es):** ${ganhadores
                .map(g => g.toString())
                .join(", ")}\n\n👥 Total de participantes: **${participantes.length}**`
            )
            .setColor("Green")
            .setTimestamp();

          await interaction.channel.send({ embeds: [resultadoEmbed] });

          const logChannel = await getLogChannel(interaction.guild, "comandos");
          if (logChannel) logChannel.send({ embeds: [resultadoEmbed] });
        }, duracao);

        break;
      }

      case "post": {
        const legenda = options.getString("legenda") ?? "";
        const video = options.getAttachment("video");
        const imagem = options.getAttachment("imagem");

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.SendMessages))
          return interaction.reply({ content: "🚫 Você não tem permissão para criar posts.", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
          .setDescription(legenda || "\u200B")
          .setColor("#2f3136")
          .setFooter({ text: `Post por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        const arquivos = [];
        if (imagem) embed.setImage(imagem.url);
        if (video) arquivos.push(video);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("like").setEmoji("<:coracao:1416086694288953536>").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("view_likes").setEmoji("<:caracoes:1416086843421626428>").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("comment").setEmoji("<:comentario:1416086890410545242>").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("view_comments").setEmoji("<:comentarios:1416086922685841438>").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("delete_post").setEmoji("<:lixo2:1416087063685763133>").setStyle(ButtonStyle.Secondary)
        );

        let postedMessage;
        try {
          postedMessage = await interaction.channel.send({ embeds: [embed], files: arquivos, components: [row] });
        } catch (err) {
          console.error(err);
          return interaction.editReply({ content: "❌ Erro ao enviar post." });
        }

        postsData[postedMessage.id] = {
          id: postedMessage.id,
          channelId: postedMessage.channel.id,
          guildId: postedMessage.guild.id,
          authorId: interaction.user.id,
          legenda,
          anexos: arquivos.map(a => a.url),
          likes: [],
          comments: [],
          createdAt: Date.now()
        };
        savePosts();

        await interaction.editReply({ content: `✅ Post criado! [Link do post](${postedMessage.url})` });
        break;
      }

      default:
        await interaction.reply({ content: "❌ Comando não reconhecido.", ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `❌ Erro: ${error.message}`, ephemeral: true });
    } else {
      await interaction.editReply({ content: `❌ Erro: ${error.message}` });
    }
  }
});

setInterval(() => {
    let alterado = false;
    for (const userId in warns) {
        warns[userId] = warns[userId].filter(w => {
            if (!w.expira) return true;
            const expiraDate = new Date(w.expira);
            if (Date.now() > expiraDate.getTime()) {
                const guild = client.guilds.cache.first();
                if (guild) {
                    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
                    if (logChannel && logChannel.isTextBased()) {
                        const embed = new EmbedBuilder()
                            .setTitle('<:alerta2:1417224508099661854> Warn Expirado')
                            .setColor('Blue')
                            .addFields(
                                { name: '<:Membro:1417224284128022598> **Membro**', value: `<@${userId}> (${userId})`, inline: false },
                                { name: '<:Motivo1:1417225384067338310> **Motivo**', value: w.motivo, inline: false },
                                { name: '<:calendario2:1417224912044560384> **Expirado em**', value: w.expira, inline: false }
                            )
                            .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1405673526257516614.png" })
                            .setTimestamp();
                        logChannel.send({ embeds: [embed] });
                    }
                }
                alterado = true;
                return false;
            }
            return true;
        });
    }
    if (alterado) saveWarns();
}, 60 * 1000);

// ======/ LOGS \======

const connectLogChannelId = '1416114287747010622';

// == BOT READY ==
client.once('ready', () => {
  const logChannel = client.channels.cache.get(connectLogChannelId);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle('<:Ready1:1417224117467480094> Ghost Family - Conectado')
    .setDescription('O bot foi iniciado com sucesso!')
    .setColor('Green')
    .setFooter({ 
      text: 'Ghost', 
      iconURL: 'https://cdn.discordapp.com/emojis/1412490276366192712.png'
    });

  logChannel.send({ embeds: [embed] });
});

client.once('ready', () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  client.user.setActivity('Ghost Family', { type: ActivityType.Playing });
});

// == LOG DE BAN ==
client.on("guildBanAdd", async (ban) => {
    try {
        const banLogChannel = ban.guild.channels.cache.get("1401705638668669149");
        if (!banLogChannel) {
            console.warn("Canal de logs de ban não encontrado.");
            return;
        }

        let executor = "Desconhecido";
        let motivo = "Ban manual ou sem motivo informado.";

        try {
            // espera um pouco antes de buscar os audit logs
            await new Promise(res => setTimeout(res, 1000));

            const auditLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (entry && entry.target?.id === ban.user.id) {
                // se o executor for o próprio bot, não manda log
                if (entry.executor.id === ban.client.user.id) return;

                executor = `<@${entry.executor.id}> | ${entry.executor.id}`;
                motivo = entry.reason || motivo;
            }
        } catch (err) {
            console.error("Erro ao buscar logs de auditoria:", err);
        }

        const embedBan = new EmbedBuilder()
            .setTitle("**Membro Banido** (Manual)")
            .setColor("DarkRed")
            .addFields(
                { name: "<:Membro:1417224284128022598> Membro", value: `<@${ban.user.id}> | ${ban.user.id}` },
                { name: "<:staff1:1417226645114191913> Staff", value: executor },
                { name: "<:Motivo1:1417225384067338310> Motivo", value: `\`\`\`${motivo}\`\`\`` }
            )
            .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1412490276366192712.png" })
            .setTimestamp();

        await banLogChannel.send({ embeds: [embedBan] });

    } catch (err) {
        console.error("Erro ao registrar ban manual:", err);
    }
});

// == MENSAGEM EDITADA ==
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild || newMessage.author?.bot) return;

    const logChannel = client.channels.cache.get(logChannels.mensagens);
    if (!logChannel?.isTextBased()) return;

    // Evita registrar se não mudou o conteúdo
    if (oldMessage.content === newMessage.content) return;

    const autor = oldMessage.author || newMessage.author;

    const embed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('<:editar1:1417226550431973406> Mensagem Editada')
        .addFields(
            { name: '<:Membro:1417224284128022598> Autor', value: autor ? `${autor} | \`${autor.id}\`` : '❓ Autor desconhecido', inline: true },
            { name: '<:canal1:1417225554796478514> Canal', value: `<#${oldMessage.channel.id}>`, inline: true },
            { name: '<:antes1:1417226283502538844> Antes', value: `\`${oldMessage.content}\`` || '⚠️ Sem conteúdo', inline: false },
            { name: '<:depois1:1417226327324626964> Depois', value: `\`${newMessage.content}\`` || '⚠️ Sem conteúdo', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Ghost', iconURL: "https://cdn.discordapp.com/emojis/1412490276366192712.png" });

    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// == MENSAGEM APAGADA ==
client.on('messageDelete', async (message) => {
    if (!message.guild) return;
    if (message.partial) {
        try {
            await message.fetch();
        } catch {
            return;
        }
    }

    if (!message.author || message.author.bot) return;

    const logChannel = client.channels.cache.get(logChannels.mensagens);
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('<:lixo2:1417241954621849601> Mensagem Excluída')
        .addFields(
            { name: '<:Membro:1417224284128022598> Autor', value: `${message.author} | \`${message.author.id}\``, inline: true },
            { name: '<:canal1:1417225554796478514> Canal', value: `<#${message.channel.id}>`, inline: true },
            { name: '<:chat1:1417225204157120743> Conteúdo', value: message.content || '⚠️ Sem conteúdo', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Ghost', iconURL: 'https://cdn.discordapp.com/emojis/1412490276366192712.png' });

    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// == CANAL CRIADO ==
client.on("channelCreate", async ch => {
  const logCh = await getLogChannel(ch.guild, "canais");
  if (!logCh) return;

  // Buscar quem criou via audit log
  const audit = await ch.guild.fetchAuditLogs({
    type: 10, // CHANNEL_CREATE
    limit: 1,
  }).catch(() => null);
  const entry = audit?.entries.first();
  const executor = entry?.executor;

  // Detectar tipo de canal
  let tipo = "📁 Desconhecido";
  if (ch.isTextBased()) tipo = "💬 Texto";
  if (ch.isVoiceBased()) tipo = "🎤 Voz";
  if (ch.type === 15) tipo = "📑 Fórum";
  if (ch.type === 13) tipo = "🎙️ Stage";

  const embed = new EmbedBuilder()
    .setTitle("<:chatmais1:1417225163828760768> Canal Criado")
    .setColor("Green")
    .addFields(
      { name: "<:canal1:1417225554796478514> **Canal**", value: `<#${ch.id}> | \`${ch.name}\``, inline: true },
      { name: "<:categoria1:1417224065890123867>**Categoria**", value: `\`${ch.parent ? `${ch.parent.name}` : "Nenhuma"}\``, inline: true },
      { name: "<:Tipo1:1417226185821392967> **Tipo**", value: `\`${tipo}\``, inline: true },
      { name: "<:Membro:1417224284128022598> **Criado por**", value: executor ? `<@${executor.id}> | \`${executor.id}\`` : "Desconhecido", inline: false }
    )
    .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1405673526257516614.png" })
    .setTimestamp();

  logCh.send({ embeds: [embed] });
});

// == CANAL APAGADO ==
client.on("channelDelete", async ch => {
  const logCh = await getLogChannel(ch.guild, "canais");
  if (!logCh) return;

  // Buscar quem deletou via audit log
  const audit = await ch.guild.fetchAuditLogs({
    type: 12, // CHANNEL_DELETE
    limit: 1,
  }).catch(() => null);
  const entry = audit?.entries.first();
  const executor = entry?.executor;

  let tipo = "📁 Desconhecido";
  if (ch.isTextBased()) tipo = "💬 Texto";
  if (ch.isVoiceBased()) tipo = "🎤 Voz";
  if (ch.type === 15) tipo = "📑 Fórum";
  if (ch.type === 13) tipo = "🎙️ Stage";

  const embed = new EmbedBuilder()
    .setTitle("<:chatmenos1:1417225110275883018> Canal Excluído")
    .setColor("Red")
    .addFields(
      { name: "<:canal1:1417225554796478514> **Canal**", value: `\`${ch.name}\``, inline: true },
      { name: "<:categoria1:1417224065890123867>**Categoria**", value: `\`${ch.parent ? `${ch.parent.name}` : "Nenhuma"}\``, inline: true },
      { name: "<:Tipo1:1417226185821392967> **Tipo**", value: `\`${tipo}\``, inline: true },
      { name: "<:Membro:1417224284128022598> **Excluído por**", value: executor ? `<@${executor.id}> | \`${executor.id}\`` : "Desconhecido", inline: false }
    )
    .setFooter({ text: "Ghost", iconURL: "https://cdn.discordapp.com/emojis/1405673526257516614.png" })
    .setTimestamp();

  logCh.send({ embeds: [embed] });
});

// == MEMBRO ENTROU ==
client.on('guildMemberAdd', async member => {
  try {
    const logChannel = client.channels.cache.get(logChannels.entrada2);
    if (!logChannel?.isTextBased()) return;

    // Função opcional para verificar status (pode ser sua lógica)
    const status = verificarStatus ? verificarStatus(member) : "Desconhecido";

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('<:hello1:1417225730449866963> Membro entrou')
      .addFields(
        { name: "<:Membro:1417224284128022598> Usuário", value: `${member} | \`${member.id}\``, inline: false },
        { name: "<:estatisticas:1417225057952071813> Status", value: `\`${status}`, inline: false }
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Ghost', iconURL: 'https://cdn.discordapp.com/emojis/1412490276366192712.png' })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Erro no guildMemberAdd:', err);
  }
});

// Entrada
client.on('guildMemberAdd', async member => {

  const ch = await getLogChannel(member.guild, 'entrada');
  if (!ch) {
    console.warn(`[LOG ENTRADA] Canal de log de entrada não encontrado ou sem permissão em ${member.guild.name}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#9B30FF') // Roxo
    .setTitle('<:hello1:1417225730449866963> Bem-vindo(a)!')
    .setDescription(`Seja muito bem-vindo(a), ${member}! \nEsperamos que se divirta no servidor!`)
    .setImage('attachment://welcome.png')
    .setFooter({
      text: 'Entrada Registrada',
      iconURL: 'https://cdn.discordapp.com/emojis/1201192072627040266.png'
    });

  ch.send({
    embeds: [embed],
    files: [{
      attachment: './welcome.png',
      name: 'welcome.png'
    }]
  });
});

// Saída
client.on('guildMemberRemove', async member => {

  const saidaId = logChannels['saida'];
  let ch = null;
  try {
    ch = await getLogChannel(member.guild, 'saida');
  } catch (e) {
    console.error(`[LOG SAÍDA] Erro ao buscar canal de saída:`, e);
  }
  if (!ch) {
    const guildName = member.guild.name;
    const guildId = member.guild.id;
    const saidaIdStr = saidaId ? saidaId : '(não configurado)';
    const channel = saidaId ? member.guild.channels.cache.get(saidaId) : null;
    const exists = channel ? 'SIM' : 'NÃO';
    const perms = channel ? channel.permissionsFor(member.guild.members.me)?.toArray() : '(sem canal)';
    console.warn(`[LOG SAÍDA] Canal de log de saída não encontrado ou sem permissão em ${guildName} (${guildId})`);
    console.warn(`[LOG SAÍDA] ID configurado: ${saidaIdStr} | Existe: ${exists} | Permissões: ${JSON.stringify(perms)}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#9B30FF') // Roxo
    .setTitle('<:porta1:1417225245424619681> Membro saiu do servidor')
    .setDescription(`O usuário ${member.user} deixou o servidor.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage('attachment://goodbye.png')
    .setFooter({
      text: `Saída registrada • ${member.guild.name}`,
      iconURL: 'https://cdn.discordapp.com/emojis/1201192100493821982.png'
    });

  ch.send({
    embeds: [embed],
    files: [{
      attachment: './goodbye.png',
      name: 'goodbye.png'
    }]
  });
});

// == CARGO ADICIONADO ==
client.on('guildMemberUpdate', async (oldM, newM) => {
  try {
    const logChannel = client.channels.cache.get(logChannels.cargos);
    if (!logChannel?.isTextBased()) return;

    const added   = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
    const removed = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));

    // Audit logs para identificar executor
    let executor = null;
    try {
      const audit = await newM.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberRoleUpdate,
        limit: 5
      });
      const entry = audit.entries.find(e => e.target?.id === newM.id);
      if (entry && (Date.now() - entry.createdTimestamp) < 15_000) executor = entry.executor;
    } catch {}

// == CARGO ADICIONADO ==
    if (added.size > 0) {
      const embedAdded = new EmbedBuilder()
        .setColor('Green')
        .setTitle('Cargo Adicionado')
        .setDescription(`<:cargo2:1417226929257320579> <@${newM.user.id}> ganhou o cargo:\n${added.map(r => `<@&${r.id}>`).join('\n')}`)
        .setThumbnail(newM.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Ghost', iconURL: 'https://cdn.discordapp.com/emojis/1412490276366192712.png' });

      if (executor) {
        embedAdded.addFields({ name: 'Executor', value: `<@${executor.id}> | \`${executor.id}\``, inline: true });
      }

      await logChannel.send({ embeds: [embedAdded] });
    }

// == CARGO REMOVIDO ==
    if (removed.size > 0) {
      const embedRemoved = new EmbedBuilder()
        .setColor('Red')
        .setTitle('Cargo Removido')
        .setDescription(`<:cargo1:1417226867693326407> <@${newM.user.id}> perdeu o cargo:\n${removed.map(r => `<@&${r.id}>`).join('\n')}`)
        .setThumbnail(newM.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Ghost', iconURL: 'https://cdn.discordapp.com/emojis/1412490276366192712.png' });

      if (executor) {
        embedRemoved.addFields({ name: 'Executor', value: `<@${executor.id}> | \`${executor.id}\``, inline: true });
      }

      await logChannel.send({ embeds: [embedRemoved] });
    }

  } catch (err) {
    console.error('Erro no guildMemberUpdate:', err);
  }
});

// == RASTREAMENTO DE CALL ( STATS ) ==
client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.id;
  if (!userStats[userId]) userStats[userId] = { mensagens: 0, tempoCall: 0, lastJoin: null };

  if (!oldState.channelId && newState.channelId) {
    userStats[userId].lastJoin = Date.now();
    saveStats();
  } else if (oldState.channelId && !newState.channelId && userStats[userId].lastJoin) {
    const duracao = Date.now() - userStats[userId].lastJoin;
    userStats[userId].tempoCall += duracao;
    userStats[userId].lastJoin = null;
    saveStats();
  }
});

setInterval(() => {
  let mudou = false;
  for (const [id, stats] of Object.entries(userStats)) {
    if (stats.lastJoin) {
      const agora = Date.now();
      const duracao = agora - stats.lastJoin;
      stats.tempoCall += duracao;
      stats.lastJoin = agora;
      mudou = true;
    }
  }
  if (mudou) saveStats();
}, 60000);

client.login(TOKEN);