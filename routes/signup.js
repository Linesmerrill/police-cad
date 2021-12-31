var express = require('express');
var router = express.Router();

/* GET signup page */
router.get('/', function (req, res) {
    res.redirect('/');
});

router.get('/civ', function (req, res) {
    return res.render('signup-civ', {
      message: req.flash('signuperror')
    });
  });

  router.get('/police', function (req, res) {
    return res.render('signup-police', {
      message: req.flash('signuperror')
    });
  });

  router.get('/ems', function (req, res) {
    return res.render('signup-ems', {
      message: req.flash('signuperror')
    });
  });

  router.get('/community', function (req, res) {
    return res.render('signup-community', {
      message: req.flash('signuperror')
    });
  });

  router.get('/dispatch', function (req, res) {
    return res.render('signup-dispatch', {
      message: req.flash('signuperror')
    });
  });

module.exports = router;