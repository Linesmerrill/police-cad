var mongoose = require('mongoose');
var got = require('got');

var communitySchema = mongoose.Schema({
  community: {
    name: String,
    ownerID: String,
    code: String,
    activePanics: Map,
    activeSignal100: Boolean,
    createdAt: Date,
    updatedAt: Date
  }
});

communitySchema.methods.createCommunity = function (req, res) {
  // console.debug("community req body: ", req.body)

  if (exists(req.body.communityName)) {
    this.community.name = req.body.communityName.trim().toLowerCase();
  }
  if (exists(req.body.userID)) {
    this.community.ownerID = req.body.userID;
  }
  this.community.code = makeID(7);
  this.community.createdAt = new Date();

  res.redirect('back');
};

communitySchema.methods.createPoliceCommunity = function (req, res) {
  // console.debug("community req body: ", req.body)

  if (exists(req.body.communityName)) {
    this.community.name = req.body.communityName.trim().toLowerCase();
  }
  if (exists(req.body.userID)) {
    this.community.ownerID = req.body.userID;
  }
  this.community.code = makeID(7);
  this.community.createdAt = new Date();

  res.redirect('/' + req.body.route);
};

communitySchema.methods.createEmsCommunity = function (req, res) {
  // console.debug("community req body: ", req.body)

  if (exists(req.body.communityName)) {
    this.community.name = req.body.communityName.trim().toLowerCase();
  }
  if (exists(req.body.userID)) {
    this.community.ownerID = req.body.userID;
  }
  this.community.code = makeID(7);
  this.community.createdAt = new Date();

  res.redirect('/ems-dashboard');
};

async function getCommunity(req, res) {
  let dbCommunities = {}
  let dbMembers = {}
  let commUrl = ""
  let userUrl = ""
  try {
    commUrl = `${process.env.POLICE_CAD_API_URL}/api/v1/community/${req.session.communityID}/${req.session.passport.user}`
    let commResponse = await got(commUrl, {
      headers: {
        'Authorization': process.env.POLICE_CAD_API_TOKEN
      }
    });
    dbCommunities = JSON.parse(commResponse.body);
  } catch (error) {
      console.error(`route /communities returned the following error, url: '${commUrl}', error: ${error}`)
      return res.redirect('back')
  }
  try {
    userUrl = `${process.env.POLICE_CAD_API_URL}/api/v1/users/${req.session.communityID}`
    let userResponse = await got(userUrl, {
      headers: {
        'Authorization': process.env.POLICE_CAD_API_TOKEN
      }
    });
    dbMembers = JSON.parse(userResponse.body);
  } catch (error) {
      console.error(`route /communities returned the following error, url: '${commUrl}', error: ${error}`)
      return res.redirect('back')
  }
  return res.render('communities', {
    members: dbMembers,
    communities: dbCommunities,
    userID: req.session.passport.user,
    user: req.user
  });
}

async function getOwnedCommunities(req, res) {
  let dbCommunities = {}
    let url = `${process.env.POLICE_CAD_API_URL}/api/v1/communities/${req.session.passport.user}`
    try {
      let commOwnerResponse = await got(url, {headers: {'Authorization': process.env.POLICE_CAD_API_TOKEN}});
      dbCommunities = JSON.parse(commOwnerResponse.body);
    } catch (error) {
      console.warn(`route /owned-communities returned the following warning, url '${url}', warning: ${error.body}`)
    }
    return res.render('communities-owned', {
      communities: dbCommunities,
      userID: req.session.passport.user,
      user: req.user
    });
}

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}

function makeID(length) {
  var result = '';
  var characters = 'ABCDEFGHJKMNPRSTUVWXYZ';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

module.exports = mongoose.model('Community', communitySchema);
module.exports.getCommunity = getCommunity;
module.exports.getOwnedCommunities = getOwnedCommunities;