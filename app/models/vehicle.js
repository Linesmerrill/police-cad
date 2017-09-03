var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var vehicleSchema = mongoose.Schema({
 vehicle: {
  username: String,
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

 this.vehicle.plate = request.body.plate;
 this.vehicle.model = request.body.model;
 this.vehicle.color = request.body.color;
 this.vehicle.validRegistration = request.body.validRegistration;
 this.vehicle.validInsurance = request.body.validInsurance;
 this.vehicle.registeredOwner = request.body.registeredOwner;
 this.vehicle.isStolen = request.body.isStolen;
 this.vehicle.username = request.body.submitNewVeh;
 this.vehicle.save();
 response.redirect('/about');
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
