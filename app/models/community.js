var mongoose = require('mongoose');

var communitySchema = mongoose.Schema({
  community: {
    name: String,
    ownerID: String,
    code: String,
    createdAt: Date,
    updatedAt: Date
  }
});

communitySchema.methods.createCommunity = function (req, res) {
  // debug log showing the request body for the community request
  // console.debug("community req body: ", req.body)
  
  if (exists(req.body.communityName)){
    this.community.name = req.body.communityName.trim().toLowerCase();
  }
  if (exists(req.body.userID)){
    this.community.ownerID = req.body.userID;
  }
  this.community.code = makeID(7);
  this.community.createdAt = new Date();
  
  res.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Community', communitySchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}

function makeID(length) {
  var result           = '';
  var characters       = 'ABCDEFGHJKMNPRSTUVWXYZ';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}