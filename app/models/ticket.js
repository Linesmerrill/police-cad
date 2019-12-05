var mongoose = require('mongoose');

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
  time: String,
  civFirstName: String,
  civLastName: String,
  civID: String,
  civEmail: String,
  isWarning: Boolean
 }
});

ticketSchema.methods.updateTicket = function(request, response) {
  rawNameAndDOB = request.body.civFirstName
  adjustedNameAndDOB = rawNameAndDOB.split(" | ")
  firstNameAndLastName = adjustedNameAndDOB[0].split(" ")

  var additionalViolation = ""
  this.ticket.officerEmail = request.body.officerEmail;
  this.ticket.caseNumber = request.body.caseNumber;
  this.ticket.civFirstName = firstNameAndLastName[0].trim().charAt(0).toUpperCase() + firstNameAndLastName[0].trim().slice(1);
  this.ticket.civLastName = firstNameAndLastName[1].trim().charAt(0).toUpperCase() + firstNameAndLastName[1].trim().slice(1);
  this.ticket.plate = request.body.plate.trim().toUpperCase();
  this.ticket.model = request.body.model.trim().charAt(0).toUpperCase() + request.body.model.trim().slice(1);
  this.ticket.color = request.body.color.trim().charAt(0).toUpperCase() + request.body.color.trim().slice(1);
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
  this.ticket.amount = request.body.amount.trim();
  this.ticket.date = request.body.date.trim();
  this.ticket.time = request.body.time.trim();
  this.ticket.isWarning = request.body.isWarning;
  this.ticket.civID = adjustedNameAndDOB[2].trim();
  response.redirect('/police-dashboard');
};

module.exports = mongoose.model('Ticket', ticketSchema);
