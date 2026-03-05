const axios = require('axios');

const DOMAIN = process.env.KINTONE_DOMAIN;
const APP_ID = process.env.KINTONE_APP_ID;
const API_TOKEN = process.env.KINTONE_API_TOKEN;
const BASIC_USER = process.env.KINTONE_BASIC_USER;
const BASIC_PASS = process.env.KINTONE_BASIC_PASS;

function calculateAge(birthdateStr) {
  const [year, month, day] = birthdateStr.split('-').map(Number);
  const today = new Date();

  let age = today.getFullYear() - year;
  const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);

  if (today < birthdayThisYear) age--;

  return age;
}

async function fetchRecords() {
  const records = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await axios.get(
      `https://${DOMAIN}.cybozu.com/k/v1/records.json`,
      {
        headers: {
          'X-Cybozu-API-Token': API_TOKEN
        },
        auth: {
          username: BASIC_USER,
          password: BASIC_PASS
        },
        params: {
          app: APP_ID,
          query: `生年月日 != "" limit ${limit} offset ${offset}`
        }
      }
    );

    records.push(...res.data.records);

    if (res.data.records.length < limit) break;
    offset += limit;
  }

  return records;
}

async function bulkUpdate(records) {
  const limit = 100;

  for (let i = 0; i < records.length; i += limit) {
    const chunk = records.slice(i, i + limit);

    const updates = chunk.map(record => {
      const id = record.$id.value;
      const birthDate = record['生年月日'].value;

      if (!birthDate) return null;

      const age = calculateAge(birthDate);

      return {
        id,
        record: {
          '年齢': { value: age }
        }
      };
    }).filter(r => r !== null);

    if (updates.length > 0) {
      await axios.put(
        `https://${DOMAIN}.cybozu.com/k/v1/records.json`,
        {
          app: APP_ID,
          records: updates
        },
        {
          headers: {
            'X-Cybozu-API-Token': API_TOKEN,
            'Content-Type': 'application/json'
          },
          auth: {
            username: BASIC_USER,
            password: BASIC_PASS
          }
        }
      );

      console.log(`✅ ${updates.length} 件更新`);
    }
  }
}

(async () => {
  console.log('🔁 年齢を更新中...');
  const records = await fetchRecords();
  await bulkUpdate(records);
  console.log('🎉 更新完了');
})();
