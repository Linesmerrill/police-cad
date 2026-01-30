var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var licenseSchema = mongoose.Schema({
  license: {
    licenseType: String,
    status: String,
    expirationDate: String,
    additionalNotes: String,
    ownerID: String,
    ownerName: String,
    activeCommunityID: String,
    userID: String,
    createdAt: Date,
    updatedAt: Date,
  },
});

licenseSchema.methods.socketCreateLicense = function (req, res) {
  // console.debug("req body: ", req.body)
  if (exists(req.body.licenseType)) {
    this.license.licenseType = req.body.licenseType;
  }
  if (exists(req.body.status)) {
    this.license.status = req.body.status;
  }
  if (exists(req.body.expirationDate)) {
    this.license.expirationDate = req.body.expirationDate;
  }
  if (exists(req.body.additionalNotes)) {
    this.license.additionalNotes = req.body.additionalNotes.trim();
  }
  if (exists(req.body.ownerID)) {
    this.license.ownerID = req.body.ownerID;
  }
  if (exists(req.body.ownerName)) {
    this.license.ownerName = req.body.ownerName;
  }
  this.license.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
  this.license.userID = req.body.userID; // we set this when submitting the from so it should not be null
  this.license.createdAt = new Date();
};

function exists(v) {
  if (v !== undefined && v != null) {
    return true;
  } else {
    return false;
  }
}

module.exports = mongoose.model("License", licenseSchema);
