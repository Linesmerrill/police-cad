var mongoose = require('mongoose');

var arrestReportSchema = mongoose.Schema({
  arrestReport: {
    caseNumber: String,
    date: String,
    time: String,
    reportingOfficer: String,
    reportingOfficerEmail: String, //deprecated 6/27/2020
    reportingOfficerID: String, //introduced 6/27/2020
    accusedFirstName: String,
    accusedLastName: String,
    accusedID: String,
    charges: [{
      type: String
    }],
    detailOfEvent: String,
    actionsTaken: String,
    summary: String,
    createdAt: Date,
    updatedAt: Date
  }
});

arrestReportSchema.methods.updateArrestReport = function (req, res) {
  // console.debug("arrest report req body: ", req.body)

  if (exists(req.body.accusedFirstName) && exists(req.body.accusedLastName)) {
    if (req.body.accusedFirstName.trim().length > 1 && req.body.accusedLastName.length > 1) {
      this.arrestReport.accusedFirstName = req.body.accusedFirstName.trim().charAt(0).toUpperCase() + req.body.accusedFirstName.trim().slice(1);
      this.arrestReport.accusedLastName = req.body.accusedLastName.trim().charAt(0).toUpperCase() + req.body.accusedLastName.trim().slice(1);
    } else {
      console.error("cannot process empty values for accusedFirstName and accusedLastName");
      res.redirect('/' + req.body.route);
      return
    }
  } else {
    console.error("cannot process null values for accusedFirstName and accusedLastName");
    res.redirect('/' + req.body.route);
    return
  }

  this.arrestReport.caseNumber = req.body.caseNumber;
  this.arrestReport.date = req.body.date;
  this.arrestReport.time = req.body.time;
  if (exists(req.body.reportingOfficer)) {
    this.arrestReport.reportingOfficer = req.body.reportingOfficer.toLowerCase();
  }
  if (exists(req.body.reportingOfficerID)) {
    this.arrestReport.reportingOfficerID = req.body.reportingOfficerID.toLowerCase();
  }

  this.arrestReport.accusedID = req.body.accusedID;
  if (exists(req.body.charges)) {
    this.arrestReport.charges = req.body.charges.trim();
  }
  if (exists(req.body.detailOfEvent)) {
    this.arrestReport.detailOfEvent = req.body.detailOfEvent.trim();
  }
  if (exists(req.body.actionsTaken)) {
    this.arrestReport.actionsTaken = req.body.actionsTaken.trim();
  }
  if (exists(req.body.summary)) {
    this.arrestReport.summary = req.body.summary.trim();
  }
  this.arrestReport.createdAt = new Date();
  req.app.locals.specialContext = "createArrestSuccess"
  res.redirect('/' + req.body.route);
};

module.exports = mongoose.model('ArrestReport', arrestReportSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}