var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var vehicleSchema = mongoose.Schema({
  vehicle: {
    email: String,
    plate: String,
    vin: String,
    model: String,
    color: String,
    validRegistration: String,
    validInsurance: String,
    registeredOwner: String,
    registeredOwnerID: String,
    isStolen: String,
    activeCommunityID: String,
    userID: String,
    createdAt: Date,
    updatedAt: Date
  }
});

vehicleSchema.methods.createVeh = function (req, res) {
  // console.debug("req body: ", req.body)
  if (exists(req.body.plate)) {
    this.vehicle.plate = req.body.plate.trim().toUpperCase();
  }
  if (exists(req.body.vin)) {
    this.vehicle.vin = req.body.vin.trim().toUpperCase();
  }
  if (exists(req.body.model)) {
    this.vehicle.model = req.body.model.trim().charAt(0).toUpperCase() + req.body.model.trim().slice(1);
  }
  if (exists(req.body.color)) {
    this.vehicle.color = req.body.color.trim().charAt(0).toUpperCase() + req.body.color.trim().slice(1);
  }
  this.vehicle.validRegistration = req.body.validRegistration;
  this.vehicle.validInsurance = req.body.validInsurance;
  //registeredOwner looks like this: civilianID+civilianFirstName civilianLastName | civilianDOB
  if (exists(req.body.registeredOwner)) {
    let modOwner = req.body.registeredOwner.split("+")
    if (modOwner.length != 2) {
      // means the user did not select a user to assign the vehicle to, which is fine
      this.vehicle.registeredOwner = "N/A"
    } else {
    this.vehicle.registeredOwnerID = modOwner[0]
    this.vehicle.registeredOwner = modOwner[1].trim();
    }
  }
  
  this.vehicle.isStolen = req.body.isStolen;
  this.vehicle.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
  this.vehicle.userID = req.body.userID; // we set this when submitting the from so it should not be null
  this.vehicle.createdAt = new Date();
  res.redirect('/civ-dashboard');
};

function exists(v) {
  if (v !== undefined && v != null) {
    return true
  } else {
    return false
  }
}

module.exports = mongoose.model('Vehicle', vehicleSchema);