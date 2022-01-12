var mongoose = require('mongoose');

var callSchema = mongoose.Schema({
  call: {
    shortDescription: String,
    classifier: [{
      type: String
    }],
    assignedOfficers: [{
      type: String
    }],
    assignedFireEms: [{
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
  if (exists(req.body.shortDescription)) {
    this.call.shortDescription = req.body.shortDescription.trim();
  }
  if (exists(req.body.classifier)) {
    this.call.classifier = req.body.classifier
  }
  if (exists(req.body.assignedOfficers)) {
    this.call.assignedOfficers = req.body.assignedOfficers
  }
  if (exists(req.body.assignedFireEms)) {
    this.call.assignedFireEms = req.body.assignedFireEms
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
  return res.redirect('/' + req.body.route);
};

callSchema.methods.socketCreateCall = function (req) {
  // console.debug("call req: ", req)

  if (exists(req.shortDescription)) {
    this.call.shortDescription = req.shortDescription.trim();
  }
  if (exists(req.classifier)) {
    this.call.classifier = req.classifier
  }
  if (exists(req.assignedOfficers)) {
    this.call.assignedOfficers = req.assignedOfficers
  }
  if (exists(req.assignedFireEms)) {
    this.call.assignedFireEms = req.assignedFireEms
  }
  if (exists(req.callNotes)) {
    this.call.callNotes = req.callNotes.trim();
  }
  if (exists(req.createdByUsername)) {
    this.call.createdByUsername = req.createdByUsername;
  }
  if (exists(req.createdByID)) {
    this.call.createdByID = req.createdByID;
  }
  if (exists(req.communityID)) {
    this.call.communityID = req.communityID;
  }
  if (exists(req.createdAt)) {
    this.call.createdAt = req.createdAt;
  }
  if (exists(req.createdAtReadable)) {
    this.call.createdAtReadable = req.createdAtReadable;
  }

  this.call.status = true;
};

callSchema.methods.socketCreate911Call = function (req) {
  // console.debug("911 call req: ", req)

  if (exists(req.body.name) && exists(req.body.location)) {
    this.call.shortDescription = `911 Caller: ${req.body.name.trim()}`
  }

  if (exists(req.body.peopleDescription) && exists(req.body.peopleDescription) && exists(req.body.name) && exists(req.body.location)) {
    this.call.callNotes = `
    911 Caller: ${req.body.name.trim()}
    Location: ${req.body.location.trim()}
    Call Description: ${req.body.callDescription.trim()}
    Suspect Description: ${req.body.peopleDescription.trim()}`
  }
  if (exists(req.body.username)) {
    this.call.createdByUsername = req.body.username;
  }
  if (exists(req.body.userID)) {
    this.call.createdByID = req.body.userID;
  }
  if (exists(req.body.activeCommunityID)) {
    this.call.communityID = req.body.activeCommunityID;
  }
  if (exists(req.body.createdAt)) {
    this.call.createdAt = req.body.createdAt;
  }
  if (exists(req.body.createdAtReadable)) {
    this.call.createdAtReadable = req.body.createdAtReadable;
  }

  this.call.status = true;
};

module.exports = mongoose.model('Call', callSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}
