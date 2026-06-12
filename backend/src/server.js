const dotenv = require('dotenv');
const { app } = require('./app');

dotenv.config();

const port = Number(process.env.PORT || 4000);

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('JWT_SECRET is required');
  process.exit(1);
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
