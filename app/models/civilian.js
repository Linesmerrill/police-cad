var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var civilianSchema = mongoose.Schema({
 civilian: {
  email: String,
  firstName: String,
  lastName: String,
  licenseStatus: String,
  ticketCount: String,
  birthday: String,
  warrants: String,
  gender: String,
  address: String,
  race: String,
  hairColor: String,
  weight: String,
  height: String,
  image: String
 }
});

civilianSchema.methods.updateCiv = function(request, response) {

 this.civilian.firstName = request.body.civFirstName.trim().charAt(0).toUpperCase() + request.body.civFirstName.trim().slice(1);
 this.civilian.lastName = request.body.civLastName.trim().charAt(0).toUpperCase() + request.body.civLastName.trim().slice(1);
 this.civilian.licenseStatus = request.body.licenseStatus;
 this.civilian.ticketCount = request.body.ticketCount;
 this.civilian.birthday = request.body.birthday;
 this.civilian.warrants = request.body.warrants;
 this.civilian.email = request.body.submitNewCiv;
 response.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Civilian', civilianSchema);
