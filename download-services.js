const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const { execSync } = require('child_process');

const SERVICES_DIR = path.join(__dirname, '.local-services');
const POSTGRES_URL = 'https://get.enterprisedb.com/postgresql/postgresql-16.14-1-windows-x64-binaries.zip';
const REDIS_URL = 'https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip';

async function downloadFile(url, outputPath) {
  console.log(`Downloading ${url} to ${outputPath}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);
  const fileStream = fs.createWriteStream(outputPath);
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
  console.log(`Downloaded successfully.`);
}

async function main() {
  if (!fs.existsSync(SERVICES_DIR)) {
    fs.mkdirSync(SERVICES_DIR, { recursive: true });
  }

  const postgresZip = path.join(SERVICES_DIR, 'postgresql.zip');
  const redisZip = path.join(SERVICES_DIR, 'redis.zip');

  // Download files
  try {
    if (!fs.existsSync(postgresZip)) {
      await downloadFile(POSTGRES_URL, postgresZip);
    } else {
      console.log('PostgreSQL zip already exists.');
    }

    if (!fs.existsSync(redisZip)) {
      await downloadFile(REDIS_URL, redisZip);
    } else {
      console.log('Redis zip already exists.');
    }

    // Extract files
    const postgresDest = path.join(SERVICES_DIR, 'postgresql');
    const redisDest = path.join(SERVICES_DIR, 'redis');

    if (!fs.existsSync(postgresDest)) {
      fs.mkdirSync(postgresDest, { recursive: true });
      console.log('Extracting PostgreSQL...');
      execSync(`tar -xf "${postgresZip}" -C "${postgresDest}"`);
      console.log('PostgreSQL extracted.');
    } else {
      console.log('PostgreSQL already extracted.');
    }

    if (!fs.existsSync(redisDest)) {
      fs.mkdirSync(redisDest, { recursive: true });
      console.log('Extracting Redis...');
      execSync(`tar -xf "${redisZip}" -C "${redisDest}"`);
      console.log('Redis extracted.');
    } else {
      console.log('Redis already extracted.');
    }

    console.log('All downloads and extractions completed successfully.');
  } catch (error) {
    console.error('Error in download or extraction:', error);
    process.exit(1);
  }
}

main();
