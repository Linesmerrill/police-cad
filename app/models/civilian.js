var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var civilianSchema = mongoose.Schema({
 civilian: {
  username: String,
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

 this.civilian.firstName = request.body.civFirstName;
 this.civilian.lastName = request.body.civLastName;
 this.civilian.licenseStatus = request.body.licenseStatus;
 this.civilian.ticketCount = request.body.ticketCount;
 this.civilian.birthday = request.body.birthday;
 this.civilian.warrants = request.body.warrants;
 this.civilian.username = request.body.submitNewCiv;
 this.civilian.save();
 response.redirect('/about');
};

module.exports = mongoose.model('Civilian', civilianSchema);
