var express = require('express');
var router = express.Router();
var passport = require('passport');

/* GET login page */
router.get('/', function (req, res) {
    res.redirect('/');
});

/* GET login civ page */
router.get('/civ', authCivilian, function (req, res) {
    res.locals.user = req.user;
    return res.redirect('/dashboard/civ');
});

/* POST login civ page */
router.post('/civ', passport.authenticate('login', {
    successRedirect: '/dashboard/civ',
    failureRedirect: '/login/civ',
    failureFlash: true
  }));

/* GET login police page */
router.get('/police', authPolice, function (req, res) {
    return res.redirect('/dashboard/police')
});

/* POST login police page */
router.post('/police', passport.authenticate('login', {
    successRedirect: '/dashboard/police',
    failureRedirect: '/police',
    failureFlash: true
  }));

/* GET login ems page */
router.get('/ems', authEms, function (req, res) {
    return res.redirect('/dashboard/ems')
});

/* POST login ems page */
router.post('/ems', passport.authenticate('login', {
    successRedirect: '/dashboard/ems',
    failureRedirect: '/ems',
    failureFlash: true
  }));

/* GET login community page */
router.get('/community', authCommunity, function (req, res) {
    return res.redirect('/dashboard/community')
});

/* POST login community page */
router.post('/community', passport.authenticate('login', {
    successRedirect: '/dashboard/community',
    failureRedirect: '/community',
    failureFlash: true
  }));

/* GET login dispatch page */
router.get('/dispatch', authDispatch, function (req, res) {
    return res.redirect('/dashboard/dispatch')
});

/* POST login dispatch page */
router.post('/dispatch', passport.authenticate('login', {
    successRedirect: '/dashboard/dispatch',
    failureRedirect: '/dispatch',
    failureFlash: true
  }));

  function authCivilian(req, res, next) {
    if (req.isAuthenticated()) {
        res.locals.user = req.user;
      return next();
    }
    res.render('login-civ', {
      message: req.flash('error')
    });
  }
  
  function authPolice(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.render('login-police', {
      message: req.flash('error')
    });
  }
  
  function authEms(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.render('login-ems', {
      message: req.flash('error')
    });
  }
  
  function authCommunity(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.render('login-community', {
      message: req.flash('error')
    });
  }
  
  function authDispatch(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.render('login-dispatch', {
      message: req.flash('error')
    });
  }

module.exports = router;