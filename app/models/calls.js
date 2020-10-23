var mongoose = require('mongoose');

var callSchema = mongoose.Schema({
  call: {
    shortDescription: String,
    assignedOfficers: [{
      type: String
    }],
    callNotes: [{
      type: String
    }],
    communityID: String,
    createdByUsername: String,
    createdByID: String,
    clearingOfficerUsername: String,
    clearingOfficerID: String,
    status: Boolean,
    createdAt: Date, //includes date and time
    createdAtReadable: String, //to display nicely with esx
    updatedAt: Date, //includes date and time
  }
});

callSchema.methods.createCall = function (req, res) {
  // debug log showing the request body for the call request
  // console.debug("call req body: ", req.body)

  if (exists(req.body.shortDescription)) {
    this.call.shortDescription = req.body.shortDescription.trim();
  }
  if (exists(req.body.assignedOfficers)) {
    this.call.assignedOfficers = req.body.assignedOfficers
  }
  if (exists(req.body.callNotes)) {
    this.call.callNotes = req.body.callNotes.trim();
  }
  if (exists(req.body.createdByUsername)) {
    this.call.createdByUsername = req.body.createdByUsername;
  }
  if (exists(req.body.createdByID)) {
    this.call.createdByID = req.body.createdByID;
  }
  if (exists(req.body.communityID)) {
    this.call.communityID = req.body.communityID;
  }

  this.call.status = true;
  this.call.createdAt = new Date();
  createdDate = new Date(this.call.createdAt);
  this.call.createdAtReadable = createdDate.toLocaleString()
  req.app.locals.specialContext = "createCallSuccess"
  res.redirect('/' + req.body.route);
};

// boloSchema.methods.socketCreateBolo = function (req, res) {
//    // debug log showing the request body for the bolo request
//   //  console.debug("bolo req body: ", req)

//    if (exists(req.boloType)) {
//      this.bolo.boloType = req.boloType.toLowerCase();
//    }
//    if (exists(req.location)) {
//      this.bolo.location = req.location.trim();
//    }
//    if (exists(req.communityID)) {
//      this.bolo.communityID = req.communityID;
//    }
//    if (exists(req.description)) {
//      this.bolo.description = req.description.trim();
//    }
//    if (exists(req.reportingOfficerUsername)) {
//      this.bolo.reportingOfficerUsername = req.reportingOfficerUsername;
//    }
//    if (exists(req.reportingOfficerID)) {
//      this.bolo.reportingOfficerID = req.reportingOfficerID;
//    }

//    this.bolo.status = true;
//    this.bolo.createdAt = new Date();

//    // req.app.locals.specialContext = "createBoloSuccess"
//    // res.redirect('/'+req.body.route);
//  };

module.exports = mongoose.model('Call', callSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}