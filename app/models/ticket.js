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

ticketSchema.methods.updateTicket = function (request, response) {
  var adjustedNameAndDOB
  rawNameAndDOB = request.body.civFirstName
  if (rawNameAndDOB.includes("|")) {
    adjustedNameAndDOB = rawNameAndDOB.split(" | ")
    firstNameAndLastName = adjustedNameAndDOB[0].split(" ")
    this.ticket.civFirstName = firstNameAndLastName[0].trim().charAt(0).toUpperCase() + firstNameAndLastName[0].trim().slice(1);
    this.ticket.civLastName = firstNameAndLastName[1].trim().charAt(0).toUpperCase() + firstNameAndLastName[1].trim().slice(1);
  } else {
    this.ticket.civFirstName = request.body.civFirstName.trim().charAt(0).toUpperCase() + request.body.civFirstName.trim().slice(1);
    this.ticket.civLastName = request.body.civLastName.trim().charAt(0).toUpperCase() + request.body.civLastName.trim().slice(1);
  }
  

  var additionalViolation = ""
  this.ticket.officerEmail = request.body.officerEmail.toLowerCase();
  this.ticket.caseNumber = request.body.caseNumber;
  this.ticket.plate = request.body.plate.trim().toUpperCase();
  this.ticket.model = request.body.model.trim().charAt(0).toUpperCase() + request.body.model.trim().slice(1);
  this.ticket.color = request.body.color.trim().charAt(0).toUpperCase() + request.body.color.trim().slice(1);
  if (exists(request.body.speedViolation)) {
    additionalViolation = ' - ' + additionalViolation + request.body.speedViolation + ' '
  }
  if (exists(request.body.duiViolation)) {
    additionalViolation = ' - ' + additionalViolation + request.body.duiViolation + ' '
  }
  if (exists(request.body.driverLicenseViolation)) {
    additionalViolation = ' - ' + additionalViolation + request.body.driverLicenseViolation + ' '
  }
  if (request.body.otherInput !== '') {
    additionalViolation = ' - ' + additionalViolation + request.body.otherInput
  }
  if (exists(adjustedNameAndDOB)) {
    if (exists(adjustedNameAndDOB[2])) {
      this.ticket.civID = adjustedNameAndDOB[2].trim();
    }
  }
  this.ticket.violation = request.body.violations + additionalViolation;
  this.ticket.amount = request.body.amount.trim();
  this.ticket.date = request.body.date.trim();
  this.ticket.time = request.body.time.trim();
  this.ticket.isWarning = request.body.isWarning;
  
  response.redirect('/police-dashboard');
};

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}

module.exports = mongoose.model('Ticket', ticketSchema);