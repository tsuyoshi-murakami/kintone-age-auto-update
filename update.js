
import axios from 'axios';

const SUBDOMAIN = process.env.KINTONE_DOMAIN;
const DOMAIN = `https://${SUBDOMAIN}.cybozu.com`;
const APP_ID = process.env.KINTONE_APP_ID;
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

  if (today < thisYearBirthday) {
    age--;
  }

  return age;
}

const axiosInstance = axios.create({
  auth: BASIC_USER && BASIC_PASS ? {
    username: BASIC_USER,
    password: BASIC_PASS
  } : undefined,
  headers: {
    'X-Cybozu-API-Token': API_TOKEN,
    'Content-Type': 'application/json'
  }
});

async function fetchRecords(offset = 0, all = []) {
  const res = await axiosInstance.get(`${BASE_URL}/records.json`, {
    params: {
      app: APP_ID,
      query: `limit 100 offset ${offset}`
    }
  });

  const records = res.data.records;
  if (records.length === 0) return all;

  return fetchRecords(offset + 100, all.concat(records));
}

async function updateRecords() {
  const records = await fetchRecords();

  const updates = records
    .map(record => {
      const birthdate = record['生年月日']?.value;
      if (!birthdate) return null;

      const age = calculateAge(birthdate);

      return {
        id: record.$id.value,
        record: {
          年齢: { value: age }
        }
      };
    })
    .filter(Boolean);

  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);

    await axiosInstance.put(`${BASE_URL}/records.json`, {
      app: APP_ID,
      records: batch
    });

    console.log(`更新: ${i}〜${i + batch.length - 1}`);
  }
}

updateRecords().catch(err => {
  console.error(err.response?.data || err.message);
});
