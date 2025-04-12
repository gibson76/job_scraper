const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const keys = require('./credentials.json');
const express = require('express');
const app = express();

const SPREADSHEET_ID = '1mU3BXoq_EtW5Zm3NLhrupJtfwW0olBTlRotJA0SbJNI';
const SHEET_NAME = 'Jobberman Daily Jobs';

async function writeToGoogleSheet(data) {
  const auth = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const timestamp = new Date().toISOString();

  const rows = data.map(job => [
    'Jobberman',
    job.title,
    job.url,
    job.company || '',
    job.location || '',
    job.description || '',
    timestamp
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: rows
    }
  });
}

app.get('/', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.jobberman.com/jobs?q=data+analyst', {
      waitUntil: 'networkidle0'
    });

    const jobs = await page.evaluate(() => {
      const jobList = [];
      const cards = document.querySelectorAll('a[data-cy="listing-title-link"]');

      cards.forEach(el => {
        const title = el.innerText.trim();
        const url = el.href;
        const jobCard = el.closest('.search-result__job');
        const company = jobCard?.querySelector('[data-cy="company-name"]')?.innerText || '';
        const location = jobCard?.querySelector('[data-cy="job-location"]')?.innerText || '';
        const desc = jobCard?.querySelector('[data-cy="job-description"]')?.innerText || '';

        jobList.push({ title, url, company, location, description: desc });
      });

      return jobList;
    });

    await browser.close();

    await writeToGoogleSheet(jobs);
    res.status(200).json({ message: `${jobs.length} jobs written to Google Sheet.` });
  } catch (err) {
    console.error('Error scraping/writing:', err);
    res.status(500).send('Failed to scrape or write to sheet');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

















// const puppeteer = require('puppeteer');

// const express = require('express');
// const app = express();

// app.get('/', async (req, res) => {
//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ['--no-sandbox']
//   });
//   const page = await browser.newPage();
//   await page.goto('https://www.jobberman.com/jobs?q=data+analyst', {
//     waitUntil: 'networkidle0'
//   });

//   const jobs = await page.evaluate(() => {
//     const jobList = [];
//     const items = document.querySelectorAll('a[data-cy="listing-title-link"]');
//     items.forEach((el) => {
//       jobList.push(el.innerText.trim());
//     });
//     return jobList;
//   });

//   await browser.close();
//   res.json({ jobs });
// });

// const PORT = process.env.PORT || 8080;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
