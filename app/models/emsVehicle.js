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
    if (exists(req.body.plate)) {
        this.emsVehicle.plate = req.body.plate.trim().toUpperCase();
    }
    if (exists(req.body.model)) {
        this.emsVehicle.model = req.body.model.trim();
    }
    if (exists(req.body.engineNumber)) {
        this.emsVehicle.engineNumber = req.body.engineNumber.trim();
    }
    if (exists(req.body.color)) {
        this.emsVehicle.color = req.body.color.trim();
    }
    this.emsVehicle.dispatchStatus = '10-41';
    this.emsVehicle.dispatchStatusSetBy = 'System';
    this.emsVehicle.dispatchOnDuty = true;
    if (exists(req.body.registeredOwner)) {
        this.emsVehicle.registeredOwner = req.body.registeredOwner.trim();
    }
    this.emsVehicle.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.emsVehicle.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.emsVehicle.createdAt = new Date();
    res.redirect('/ems-dashboard');
};

function exists(v) {
    if (v !== undefined) {
        return true
    } else {
        return false
    }
}

module.exports = mongoose.model('EmsVehicle', emsVehicleSchema);