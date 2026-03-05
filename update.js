import axios from 'axios';

const DOMAIN = `https://${process.env.KINTONE_DOMAIN}.cybozu.com`;
const APP_ID = Number(process.env.KINTONE_APP_ID);
const API_TOKEN = process.env.KINTONE_API_TOKEN;
const BASIC_USER = process.env.KINTONE_BASIC_USER;
const BASIC_PASS = process.env.KINTONE_BASIC_PASS;

const BASE_URL = `${DOMAIN}/k/v1`;

function calculateAge(birthdateString) {
  const [year, month, day] = birthdateString.split('-').map(Number);
  const today = new Date();
  const birthdate = new Date(year, month - 1, day);

  let age = today.getFullYear() - birthdate.getFullYear();

  const thisYearBirthday = new Date(
    today.getFullYear(),
    birthdate.getMonth(),
    birthdate.getDate()
  );

  if (today < thisYearBirthday) age--;

  return age;
}

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Cybozu-API-Token': API_TOKEN,
    'Content-Type': 'application/json'
  },
});

async function fetchRecords() {
  let allRecords = [];
  let offset = 0;

  while (true) {
    const resp = await axiosInstance.get('/records.json', {
      params: {
        app: APP_ID,
        query: `limit 100 offset ${offset}`
      }
    });

    const records = resp.data.records;
    if (records.length === 0) break;

    allRecords = allRecords.concat(records);
    offset += 100;
  }

  console.log("取得件数:", allRecords.length);
  return allRecords;
}

async function updateRecords() {
  const records = await fetchRecords();

  const updates = records
    .map(record => {
      const birthdate = record['生年月日']?.value;
      if (!birthdate) return null;

      return {
        id: record.$id.value,
        record: {
          年齢: { value: calculateAge(birthdate) }
        }
      };
    })
    .filter(Boolean);

  console.log("更新対象件数:", updates.length);

  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);

    await axiosInstance.put('/records.json', {
      app: APP_ID,
      records: batch
    });

    console.log(`更新: ${i}〜${i + batch.length - 1}`);
  }
}

updateRecords().catch(err => {
  console.error("詳細エラー:", err.response?.data || err.message);
});
