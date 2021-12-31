var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.locals.message = [];
    res.render('index');
});

/** 
 * Alphabetical list of static pages
 */

/* GET about page */
router.get('/about', function (req, res) {
    res.render('about');
});

/* GET ads txt page */
router.get('/ads.txt', (req, res) => {
    res.set('Content-Type', 'text');
    let message = 'google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0';
    return res.send(new Buffer.alloc(message.length, 'google.com, pub-3842696805773142, DIRECT, f08c47fec0942fa0'));
});

/* GET contact-us page. */
router.get('/contact-us', function (req, res) {
    res.render('contact-us');
});

/* GET health page */
router.get('/health', function (req, res) {
    res.render('health');
});

/* GET map page */
router.get('/map', function (req, res) {
    res.render('map-popular');
});

/* GET map interactive page */
router.get('/map-interactive', function (req, res) {
    res.render('map-interactive');
});

/* GET not authorized page */
router.get('/not-authorized', function (req, res) {
    res.render('not-authorized');
});


/* GET penal code page */
router.get('/penal-code', function (req, res) {
    res.render('penal-code');
});

/* GET privacy policy page */
router.get('/privacy-policy', function (req, res) {
    res.render('privacy-policy');
});

/* GET release log page */
router.get('/release-log', function (req, res) {
    res.render('release-log');
});

/* GET rules page */
router.get('/rules', function (req, res) {
    res.render('rules');
});

/* GET terms and conditions page */
router.get('/terms-and-conditions', function (req, res) {
    res.render('terms-and-conditions');
});

/* GET forgot password page */
router.get('/forgot-password', function (req, res) {
    return res.render('forgot-password', {
      user: req.user,
      message: req.flash('emailSend')
    });
  });

module.exports = router;