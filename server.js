const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const bookingsRoutes = require('./routes/bookings');
const invoiceRoutes = require('./routes/invoice');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(express.static('public'));

app.use('/api/bookings', bookingsRoutes);
app.use('/api/invoice', invoiceRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
