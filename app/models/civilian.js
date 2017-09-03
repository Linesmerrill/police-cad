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

// userSchema.methods.generateHash = function(password) {
//  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
// };
//
// userSchema.methods.verifyPassword = function(password) {
//  return bcrypt.compareSync(password, this.user.password);
// };

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
