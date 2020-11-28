var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var emsVehicleSchema = mongoose.Schema({
    emsVehicle: {
        email: String, //deprecated 6/27/2020
        plate: String,
        model: String,
        color: String,
        registeredOwner: String,
        activeCommunityID: String,
        userID: String,
        createdAt: Date,
        updatedAt: Date
    }
});

emsVehicleSchema.methods.createVeh = function (req, res) {
    this.emsVehicle.plate = req.body.plate.trim().toUpperCase();
    this.emsVehicle.model = req.body.model.trim();
    this.emsVehicle.color = req.body.color.trim();
    this.emsVehicle.registeredOwner = req.body.registeredOwner.trim();
    this.emsVehicle.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.emsVehicle.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.emsVehicle.createdAt = new Date();
    res.redirect('/ems-dashboard');
};

module.exports = mongoose.model('EmsVehicle', emsVehicleSchema);