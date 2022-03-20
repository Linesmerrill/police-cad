var axios = require('axios');

var policeCadApiUrl = process.env.POLICE_CAD_API_URL
var policeCadApiToken = process.env.POLICE_CAD_API_TOKEN

// Config for axios requests, can be reused and only declared once
var config = {
  headers: {
    "Authorization": policeCadApiToken
  }
}

function getCommunity(req, res) {
    req.app.locals.specialContext = null;
    var isValid = isValidObjectIdLength(req.session.communityID, "cannot lookup invalid length communityID, route: /communities")
    if (!isValid) {
      req.app.locals.specialContext = "invalidRequest";
      res.status(400)
      return res.redirect('back')
    }
    axios.get(`${policeCadApiUrl}/api/v1/community/${req.session.communityID}/${req.session.passport.user}`, config)
      .then(function (dbCommunities) {
        if (!exists(dbCommunities.data)) {
          console.error()
          res.status(400)
          res.redirect('back')
        } else {
          axios.get(`${policeCadApiUrl}/api/v1/users/${req.session.communityID}`, config)
            .then(function (dbMembers) {
              if (!exists(dbMembers.data)) {
                res.status(400)
                res.redirect('back')
              } else {
                return res.render('communities', {
                  members: dbMembers.data,
                  communities: dbCommunities.data,
                  userID: req.session.passport.user,
                  user: req.user,
                  referer: encodeURIComponent('/communities'),
                  redirect: encodeURIComponent(redirect)
                });
              }
            }).catch((err) => {
              res.status(400)
              res.redirect('back')
            })
        }
      }).catch((err) => {
        res.status(400)
        res.redirect('back')
      })
}

function getOwnedCommunities(req, res) {
    axios.get(`${policeCadApiUrl}/api/v1/communities/${req.session.passport.user}`, config)
      .then(function (response) {
        if (!exists(response.data)) {
          res.status(400)
          res.redirect('back')
        } else {
          res.render('communities-owned', {
            communities: response.data,
            userID: req.session.passport.user,
            user: req.user,
            referer: encodeURIComponent('/owned-communities'),
            redirect: encodeURIComponent(redirect),
          });
        }
      }).catch((err) => {
        res.status(400)
        res.redirect('back')
      })
}

module.exports.getCommunity = getCommunity
module.exports.getOwnedCommunities = getOwnedCommunities