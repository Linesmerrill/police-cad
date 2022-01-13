var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var emsSchema = mongoose.Schema({
    ems: {
        email: String, //deprecated 6/27/2020
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

emsSchema.methods.create = function (req, res) {
    if (exists(req.body.emsFirstName)) {
        this.ems.firstName = req.body.emsFirstName.trim();
    }
    if (exists(req.body.emsLastName)) {
        this.ems.lastName = req.body.emsLastName.trim();
    }
    this.ems.department = req.body.department;
    this.ems.assignmentArea = req.body.assignmentArea;
    this.ems.station = req.body.station;
    this.ems.callSign = req.body.callSign;
    this.ems.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.ems.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.ems.createdAt = new Date();
    res.redirect('/ems-dashboard');
};

function exists(v) {
    if (v !== undefined) {
        return true
    } else {
        return false
    }
}

module.exports = mongoose.model('Ems', emsSchema);