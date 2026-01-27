const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('\nCopy these keys into your .env file as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
