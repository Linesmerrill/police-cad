var mongoose = require('mongoose');

var boloSchema = mongoose.Schema({
  bolo: {
    boloType: String,
    location: String,
    description: String,
    communityID: String,
    reportingOfficerUsername: String,
    reportingOfficerID: String,
    clearingOfficerUsername: String,
    clearingOfficerID: String,
    status: Boolean,
    createdAt: Date, //includes date and time
    updatedAt: Date, //includes date and time
  }
});

boloSchema.methods.createBolo = function (req, res) {
  // debug log showing the request body for the bolo request
  // console.debug("bolo req body: ", req.body)

  if (exists(req.body.boloType)) {
    this.bolo.boloType = req.body.boloType;
  }
  if (exists(req.body.location)) {
    this.bolo.location = req.body.location.trim();
  }
  if (exists(req.body.communityID)) {
    this.bolo.communityID = req.body.communityID;
  }
  if (exists(req.body.description)) {
    this.bolo.description = req.body.description.trim();
  }
  if (exists(req.body.reportingOfficerUsername)) {
    this.bolo.reportingOfficerUsername = req.body.reportingOfficerUsername;
  }
  if (exists(req.body.reportingOfficerID)) {
    this.bolo.reportingOfficerID = req.body.reportingOfficerID;
  }
  
  this.bolo.status = true;
  this.bolo.createdAt = new Date();

  req.app.locals.specialContext = "createBoloSuccess"
  res.redirect('/'+req.body.route);
};

module.exports = mongoose.model('Bolo', boloSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}