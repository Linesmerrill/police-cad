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
  if (exists(request.body.civFirstName) && exists(request.body.civLastName)){
    if (request.body.civFirstName.trim().length > 1 && request.body.civLastName.length > 1) {
      this.ticket.civFirstName = request.body.civFirstName.trim().charAt(0).toUpperCase() + request.body.civFirstName.trim().slice(1);
      this.ticket.civLastName = request.body.civLastName.trim().charAt(0).toUpperCase() + request.body.civLastName.trim().slice(1);
    } else { 
      console.error("cannot process empty values for civFirstName and civLastName");
      response.redirect('/police-dashboard');
      return
    }
  }
  else { 
    console.error("cannot process null values for civFirstName and civLastName");
    response.redirect('/police-dashboard');
    return
  }
  
  this.ticket.officerEmail = request.body.officerEmail.toLowerCase();
  this.ticket.caseNumber = request.body.caseNumber;
  if (exists(request.body.plate)){
    this.ticket.plate = request.body.plate.trim().toUpperCase(); //optional
  }
  if (exists(request.body.model)){
    this.ticket.model = request.body.model.trim().charAt(0).toUpperCase() + request.body.model.trim().slice(1); //optional
  }
  if (exists(request.body.color)){
    this.ticket.color = request.body.color.trim().charAt(0).toUpperCase() + request.body.color.trim().slice(1); //optional
  }
  if (exists(request.body.fines)) {
    //We check to see if they selected 'Other' and if so we need to grab the input value
    if (exists(request.body.other) && Array.isArray(request.body.fines)) {
    otherIndex = request.body.fines.findIndex(element => element.includes("Other"));
    request.body.fines[otherIndex] = "Other - " + request.body.other.trim()
    }
    this.ticket.violation = request.body.fines;
  }
  if (exists(request.body.amount)){
    this.ticket.amount = request.body.amount.trim();
  }
  if (exists(request.body.date)){
    this.ticket.date = request.body.date.trim();

  }
  if (exists(request.body.time)){
    this.ticket.time = request.body.time.trim();
  }
  this.ticket.isWarning = request.body.isWarning;
  if (exists(request.body.civID)) {
    this.ticket.civID = request.body.civID.trim();
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