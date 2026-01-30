var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var firearmSchema = mongoose.Schema({
  firearm: {
    serialNumber: String,
    weaponType: String,
    registeredOwner: String,
    registeredOwnerID: String,
    isStolen: String,
    activeCommunityID: String,
    userID: String,
    createdAt: Date,
    updatedAt: Date,
  },
});

firearmSchema.methods.socketCreateFirearm = function (req, res) {
  // console.debug("req body: ", req.body)
  if (exists(req.body.serialNumber)) {
    this.firearm.serialNumber = req.body.serialNumber;
  }
  if (exists(req.body.weaponType)) {
    this.firearm.weaponType = req.body.weaponType;
  }
  if (exists(req.body.registeredOwner)) {
    this.firearm.registeredOwner = req.body.registeredOwner.trim();
  }
  if (exists(req.body.registeredOwnerID)) {
    this.firearm.registeredOwnerID = req.body.registeredOwnerID;
  }
  if (exists(req.body.isStolen)) {
    this.firearm.isStolen = req.body.isStolen;
  }
  this.firearm.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
  this.firearm.userID = req.body.userID; // we set this when submitting the from so it should not be null
  this.firearm.createdAt = new Date();
};

function exists(v) {
  if (v !== undefined && v != null) {
    return true;
  } else {
    return false;
  }
}

module.exports = mongoose.model("Firearm", firearmSchema);
