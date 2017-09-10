var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var ticketSchema = mongoose.Schema({
 ticket: {
  officerEmail: String,
  civName: String,
  caseNumber: String,
  violation: String,
  plate: String,
  model: String,
  color: String,
  registeredOwner: String,
  amount: String,
  date: String,
  time: String
 }
});

ticketSchema.methods.updateTicket = function(request, response) {
  var additionalViolation = ""
 this.ticket.officerEmail = request.body.officerEmail;
 this.ticket.caseNumber = request.body.caseNumber;
 this.ticket.civName = request.body.civName.trim();
 this.ticket.plate = request.body.plate.trim();
 this.ticket.model = request.body.model.trim();
 this.ticket.color = request.body.color.trim();
 this.ticket.registeredOwner = request.body.registeredOwner.trim();
 if (request.body.speedViolation !== undefined) {
   additionalViolation = ' - ' + additionalViolation + request.body.speedViolation + ' '
 }
 if (request.body.duiViolation !== undefined) {
   additionalViolation = ' - ' + additionalViolation + request.body.duiViolation + ' '
 }
 if (request.body.driverLicenseViolation !== undefined) {
   additionalViolation = ' - ' + additionalViolation + request.body.driverLicenseViolation + ' '
 }
 if (request.body.otherInput !== '') {
   additionalViolation = ' - ' + additionalViolation + request.body.otherInput
 }
 this.ticket.violation = request.body.violations + additionalViolation;
 this.ticket.amount = request.body.amount;
 this.ticket.date = request.body.date;
 this.ticket.time = request.body.time;
 this.ticket.save();
 response.redirect('/police-dashboard');
};

module.exports = mongoose.model('Ticket', ticketSchema);
