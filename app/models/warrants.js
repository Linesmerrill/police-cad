var mongoose = require('mongoose');

var warrantSchema = mongoose.Schema({
  warrant: {
    date: String,
    time: String,
    updatedDate: String,
    updatedTime: String,
    reportingOfficer: String,
    reportingOfficerEmail: String,
    clearingOfficer: String,
    clearingOfficerEmail: String,
    accusedFirstName: String,
    accusedLastName: String,
    accusedID: String,
    reasons: [{
      type: String
    }],
    status: Boolean,
    createdAt: Date,
    updatedAt: Date
  }
});

warrantSchema.methods.createWarrant = function (req, res) {
  // console.debug("warrant req body: ", req.body)

  if (exists(req.body.date)) {
    this.warrant.date = req.body.date;
  }
  if (exists(req.body.time)) {
    this.warrant.time = req.body.time;
  }
  if (exists(req.body.reportingOfficer)) {
    this.warrant.reportingOfficer = req.body.reportingOfficer;
  }

  if (exists(req.body.accusedFirstName)) {
    this.warrant.accusedFirstName = req.body.accusedFirstName;
  }
  if (exists(req.body.accusedLastName)) {
    this.warrant.accusedLastName = req.body.accusedLastName;
  }
  if (exists(req.body.accusedID)) {
    this.warrant.accusedID = req.body.accusedID;
  }
  if (exists(req.body.reasons)) {
    //We check to see if they selected 'Other' and if so we need to grab the input value
    if ((exists(req.body.other)) && (req.body.reasons == 'Other') && (req.body.other != "")) {
      req.body.reasons = "Other - " + req.body.other.trim()
    }
    this.warrant.reasons = req.body.reasons;
  }
  this.warrant.status = true;
  this.warrant.createdAt = new Date();

  req.app.locals.specialContext = "createWarrantSuccess"
  res.redirect('/' + req.body.route);
};

module.exports = mongoose.model('Warrant', warrantSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}