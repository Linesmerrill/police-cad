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

emsVehicleSchema.methods.createVeh = function (request, response) {
    this.emsVehicle.plate = request.body.plate.trim().toUpperCase();
    this.emsVehicle.model = request.body.model.trim();
    this.emsVehicle.color = request.body.color.trim();
    this.emsVehicle.registeredOwner = request.body.registeredOwner.trim();
    this.emsVehicle.email = request.body.submitNewVeh.toLowerCase(); //deprecated 6/27/2020
    this.emsVehicle.activeCommunityID = request.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.emsVehicle.userID = request.body.userID; // we set this when submitting the from so it should not be null
    this.emsVehicle.createdAt = new Date();
    response.redirect('/ems-dashboard');
};

module.exports = mongoose.model('EmsVehicle', emsVehicleSchema);