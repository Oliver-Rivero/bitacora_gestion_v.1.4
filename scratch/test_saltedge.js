const axios = require('axios');

const appId = 'uLx1weZo9K2-DlJRiOsii9nN1JBwSBFWF_I0BRA8veQ';
const secret = 'iiq2ARwiK6EuaCUNTbf_lVf46MhctF-fNEQGAkk_g8M';

async function test() {
  console.log('--- SaltEdge Connection Test ---');
  const urls = [
    'https://www.saltedge.com/api/v5/countries',
    'https://www.saltedge.com/api/v5/institutions'
  ];

  for (const url of urls) {
    console.log(`Testing URL: ${url}`);
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Client-id': appId,
          'Service-Secret': secret
        }
      });
      console.log(`SUCCESS [${url}]:`, response.status);
    } catch (error) {
      console.log(`FAILED [${url}]:`, error.response?.status || error.message);
      if (error.response) {
        console.log('Error Data:', JSON.stringify(error.response.data));
      }
    }
  }
}

test();
