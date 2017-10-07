var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var vehicleSchema = mongoose.Schema({
 vehicle: {
  email: String,
  plate: String,
  model: String,
  color: String,
  validRegistration: String,
  validInsurance: String,
  registeredOwner: String,
  isStolen: String
 }
});

vehicleSchema.methods.updateVeh = function(request, response) {

 this.vehicle.plate = request.body.plate.trim().toUpperCase();
 this.vehicle.model = request.body.model.trim();
 this.vehicle.color = request.body.color.trim();
 this.vehicle.validRegistration = request.body.validRegistration;
 this.vehicle.validInsurance = request.body.validInsurance;
 this.vehicle.registeredOwner = request.body.registeredOwner.trim();
 this.vehicle.isStolen = request.body.isStolen;
 this.vehicle.email = request.body.submitNewVeh;
 this.vehicle.save();
 response.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
