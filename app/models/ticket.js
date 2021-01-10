var mongoose = require('mongoose');

var ticketSchema = mongoose.Schema({
  ticket: {
    officerID: String,
    caseNumber: String,
    violation: [{
      type: String
    }],
    plate: String,
    model: String,
    color: String,
    registeredOwner: String,
    amount: String,
    date: String,
    time: String,
    civID: String,
    civEmail: String,
    isWarning: Boolean,
    createdAt: Date,
    updatedAt: Date,
    civName: String, //deprecated 6/27/2020
    civFirstName: String, //deprecated 6/27/2020
    civLastName: String, //deprecated 6/27/2020
    officerEmail: String //deprecated 6/27/2020
  }
});

ticketSchema.methods.updateTicket = function (req, res) {
  // console.debug("ticket req body: ", req.body)

  rawNameAndDOB = req.body.civFirstName //deprecated 6/27/2020

  //deprecated 6/27/2020
  if (exists(req.body.civFirstName) && exists(req.body.civLastName)) {
    if (req.body.civFirstName.trim().length > 1 && req.body.civLastName.length > 1) {
      this.ticket.civFirstName = req.body.civFirstName.trim().charAt(0).toUpperCase() + req.body.civFirstName.trim().slice(1);
      this.ticket.civLastName = req.body.civLastName.trim().charAt(0).toUpperCase() + req.body.civLastName.trim().slice(1);
    } else {
      console.error("cannot process empty values for civFirstName and civLastName");
      res.redirect('/police-dashboard');
      return
    }
  } else {
    console.error("cannot process null values for civFirstName and civLastName");
    res.redirect('/police-dashboard');
    return
  }

  this.ticket.officerID = req.body.officerID;
  this.ticket.caseNumber = req.body.caseNumber;
  if (exists(req.body.plate)) {
    this.ticket.plate = req.body.plate.trim().toUpperCase(); //optional
  }
  if (exists(req.body.model)) {
    this.ticket.model = req.body.model.trim().charAt(0).toUpperCase() + req.body.model.trim().slice(1); //optional
  }
  if (exists(req.body.color)) {
    this.ticket.color = req.body.color.trim().charAt(0).toUpperCase() + req.body.color.trim().slice(1); //optional
  }
  if (exists(req.body.crimeList)) {
    //We check to see if they selected 'Other' and if so we need to grab the input value
    if (exists(req.body.other) && Array.isArray(req.body.crimeList)) {
      otherIndex = req.body.crimeList.findIndex(element => element.includes("Other"));
      req.body.crimeList[otherIndex] = "Other - " + req.body.other.trim()
    } else if (req.body.other.trim() != "") {
      req.body.crimeList = "Other - " + req.body.other.trim()
    }
    this.ticket.violation = req.body.crimeList;
  }
  if (exists(req.body.amount)) {
    this.ticket.amount = req.body.amount.trim();
  }
  if (exists(req.body.date)) {
    this.ticket.date = req.body.date.trim();

  }
  if (exists(req.body.time)) {
    this.ticket.time = req.body.time.trim();
  }
  this.ticket.isWarning = req.body.isWarning;
  if (exists(req.body.civID)) {
    this.ticket.civID = req.body.civID.trim();
  }
  this.ticket.createdAt = new Date();

  // for alert message to show up on dashboard after a redirect
  if (req.body.isWarning == "true") {
    req.app.locals.specialContext = "createWarningSuccess"
  } else {
    req.app.locals.specialContext = "createTicketSuccess"
  }
  res.redirect('/' + req.body.route);
};

module.exports = mongoose.model('Ticket', ticketSchema);

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}