var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var emsSchema = mongoose.Schema({
    ems: {
        email: String,
        firstName: String,
        lastName: String,
        department: String,
        assignmentArea: String,
        station: String,
        callSign: String,
        activeCommunityID: String,
        userID: String,
        createdAt: Date,
        updatedAt: Date
    }
});

emsSchema.methods.create = function (request, response) {
    this.ems.firstName = request.body.emsFirstName.trim();
    this.ems.lastName = request.body.emsLastName.trim();
    this.ems.department = request.body.department;
    this.ems.assignmentArea = request.body.assignmentArea;
    this.ems.station = request.body.station;
    this.ems.callSign = request.body.callSign;
    this.ems.email = request.body.submitNewEms.toLowerCase();
    this.ems.activeCommunityID = request.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.ems.userID = request.body.userID; // we set this when submitting the from so it should not be null
    this.ems.createdAt = new Date();
    response.redirect('/ems-dashboard');
};

module.exports = mongoose.model('Ems', emsSchema);