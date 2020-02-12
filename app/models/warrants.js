var mongoose = require('mongoose');

var warrantSchema = mongoose.Schema({
  warrant: {
    date: String,
    time: String,
    reportingOfficer: String,
    reportingOfficerEmail: String,
    accusedFirstName: String,
    accusedLastName: String,
    accusedID: String,
    reasons: [{type: String}],
    status: Boolean
  }
});

warrantSchema.methods.createWarrant = function (req, res) {
  // debug log showing the request body for the warrant request
  // console.debug("warrant req body: ", req.body)
  
  if (exists(req.body.date)){
    this.warrant.date = req.body.date;
  }
  if (exists(req.body.time)){
    this.warrant.time = req.body.time;
  }
  if (exists(req.body.reportingOfficer)){
    this.warrant.reportingOfficer = req.body.reportingOfficer;
  }
  if (exists(req.body.reportingOfficerEmail)){
    this.warrant.reportingOfficerEmail = req.body.reportingOfficerEmail;
  }
  if (exists(req.body.accusedFirstName)){
    this.warrant.accusedFirstName = req.body.accusedFirstName;
  }
  if (exists(req.body.accusedLastName)){
    this.warrant.accusedLastName = req.body.accusedLastName;
  }
  if (exists(req.body.accusedID)){
    this.warrant.accusedID = req.body.accusedID;
  }
  if (exists(req.body.reasons)){
    this.warrant.reasons = req.body.reasons;
  }
  this.warrant.status = true;
  
  res.redirect('/police-dashboard');
};

module.exports = mongoose.model('Warrant', warrantSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}