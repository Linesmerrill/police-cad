var mongoose = require('mongoose');

var ticketSchema = mongoose.Schema({
  ticket: {
    officerEmail: String,
    civName: String,
    caseNumber: String,
    violation: [{type: String}],
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
  //debug log showing the request body for the ticket request
  // console.debug("ticket request body: ", request.body)
  rawNameAndDOB = request.body.civFirstName
  if (request.body.civFirstName.trim().length > 1 && request.body.civLastName.length > 1) {
    this.ticket.civFirstName = request.body.civFirstName.trim().charAt(0).toUpperCase() + request.body.civFirstName.trim().slice(1);
    this.ticket.civLastName = request.body.civLastName.trim().charAt(0).toUpperCase() + request.body.civLastName.trim().slice(1);
  } else { 
    console.error("cannot process empty values for civFirstName and civLastName");
    response.redirect('/police-dashboard');
    return
  }
  
  this.ticket.officerEmail = request.body.officerEmail.toLowerCase();
  this.ticket.caseNumber = request.body.caseNumber;
  this.ticket.plate = request.body.plate.trim().toUpperCase(); //optional
  this.ticket.model = request.body.model.trim().charAt(0).toUpperCase() + request.body.model.trim().slice(1); //optional
  this.ticket.color = request.body.color.trim().charAt(0).toUpperCase() + request.body.color.trim().slice(1); //optional
  this.ticket.violation = request.body.fines;
  this.ticket.amount = request.body.amount.trim();
  this.ticket.date = request.body.date.trim();
  this.ticket.time = request.body.time.trim();
  this.ticket.isWarning = request.body.isWarning;
  if (exists(request.body.civID)) {
    this.ticket.civID = request.body.civID.trim();
  } else {
    this.ticket.civID = request.body.civID
  }
  response.redirect('/police-dashboard');
};

module.exports = mongoose.model('Ticket', ticketSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}