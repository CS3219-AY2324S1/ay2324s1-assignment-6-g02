const axios = require('axios');
const csvtojson = require('csvtojson');
const { MongoClient } = require('mongodb');
require('dotenv').config();


const MONGODB_URI = process.env.MONGODB_URI;
const CSV_URL = 'https://drive.google.com/uc?export=download&id=16x3-A77nMYU6O4KElVQw-0UjiLQfsABO';

const BATCH_SIZE = 500;

async function insertBatch(collection, batch) {
  if (batch.length > 0) {
    await collection.insertMany(batch);
  }
}

exports.handler = async (event) => {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('questions_app');
    const collection = db.collection('questions');

    const response = await axios.get(CSV_URL);
    const questions = await csvtojson().fromString(response.data);
    console.log('Questions:', questions.length)

    let batch = [];
    for (const question of questions) {
      const questionData = {
        title: question.title,
        description: question.Body,
        complexity: question.difficulty,
        categories: question.topicTags ? question.topicTags.split(',') : []
      };

      batch.push(questionData);

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(collection, batch);
        batch = []; // Reset the batch
      }
    }

    // Insert the last batch
    if (batch.length > 0) {
      await insertBatch(collection, batch);
    }

    return { statusCode: 200, body: 'Questions processed and inserted into MongoDB' };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: 'Error processing data' };
  } finally {
    await client.close();
  }
};

async function localTest() {
  const result = await exports.handler();
  console.log(result);
}
  
// localTest().catch(console.error);
  