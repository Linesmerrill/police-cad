var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var emsVehicleSchema = mongoose.Schema({
    emsVehicle: {
        email: String, //deprecated 6/27/2020
        plate: String,
        model: String, // Ambulance or Firetruck etc.
        engineNumber: String, // Call sign for vehicle ex. Engine '31'
        color: String,
        dispatchStatus: String,
        dispatchStatusSetBy: String,
        dispatchOnDuty: String,
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
    this.emsVehicle.engineNumber = req.body.engineNumber.trim();
    this.emsVehicle.color = req.body.color.trim();
    this.emsVehicle.dispatchStatus = '10-41';
    this.emsVehicle.dispatchStatusSetBy = 'System';
    this.emsVehicle.dispatchOnDuty = true;
    this.emsVehicle.registeredOwner = req.body.registeredOwner.trim();
    this.emsVehicle.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.emsVehicle.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.emsVehicle.createdAt = new Date();
    res.redirect('/ems-dashboard');
};

module.exports = mongoose.model('EmsVehicle', emsVehicleSchema);
