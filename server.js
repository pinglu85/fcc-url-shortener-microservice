'use strict';

const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('dotenv').config();

const cors = require('cors');

const randomStrGenerator = require('./utils/generateRandomStr');

const app = express();

// Basic Configuration
/** this project needs a db !! **/
// mongoose.connect(process.env.DB_URI);
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((error) => {
    throw new Error(error);
  });

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));

// Serves public assets
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// url schema
const Schema = mongoose.Schema;
const urlSchema = new Schema(
  {
    originalUrl: String,
    shortUrl: String,
  },
  {
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 1000,
    },
  }
);

// url model
const UrlModel = mongoose.model('URL', urlSchema);

// URL regex
const urlRegex = /^https?:\/\/([a-z\d]+-*[a-z\d]+\.[a-z\d]+-*[a-z\d]+|[a-z\d]+-*[a-z\d]+)\.[a-z]{2,}(\/|\/\w{1,})?/;

// URL shortener API endpoint
// Post new url
app.post('/api/shorturl/new', (req, res, next) => {
  const url = req.body.url;
  let hostname = '';

  // Checks if url is valid
  if (urlRegex.test(url)) {
    // Extracts hostname from url
    hostname = url
      .replace(/^https?:\/\//, '')
      .replace(/\/.*/, '')
      .replace(/(^[a-z\d-_]{1,}\.)([a-z\d-_]{1,}\.[a-z\d]{2,}$)/, '$2');

    // Checks if url points to a valid site
    dns.lookup(hostname, (err) => {
      if (err) {
        res.json({ error: 'Host does not exist' });
      } else {
        const shortUrl = randomStrGenerator(6);

        // Checks if url exists in database
        UrlModel.findOne({ originalUrl: url }, (queryError, queryResult) => {
          if (queryError) return next(queryError);
          if (queryResult) {
            res.json({
              original_url: queryResult.originalUrl,
              short_url: queryResult.shortUrl,
            });
          } else {
            const urlRecord = new UrlModel({
              originalUrl: url,
              shortUrl: shortUrl,
            });
            urlRecord.save((saveError, savedResult) => {
              if (saveError) return next(saveError);
              res.json({
                original_url: savedResult.originalUrl,
                short_url: savedResult.shortUrl,
              });
            });
          }
        });
      }
    });
  } else {
    res.json({ error: 'invalid url' });
  }
});

// Get saved original url
app.get('/api/shorturl/:short_url', (req, res, next) => {
  UrlModel.findOne({ shortUrl: req.params.short_url }, (err, result) => {
    if (err) return next(err);
    if (!result) return next();
    res.redirect(result.originalUrl);
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  let errCode;
  let errMessage;
  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt').send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Node.js listening on ' + listener.address().port);
});
