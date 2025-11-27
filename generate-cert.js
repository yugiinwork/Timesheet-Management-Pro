
import selfsigned from 'selfsigned';
import fs from 'fs';

const attrs = [{ name: 'commonName', value: '10.53.14.50' }];
const pems = selfsigned.generate(attrs, { days: 3650 }); // 10 years

fs.writeFileSync('cert.pem', pems.cert);
fs.writeFileSync('key.pem', pems.private);

console.log('Certificate generated successfully (valid for 10 years).');
