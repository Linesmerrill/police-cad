var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var vehicleSchema = mongoose.Schema({
    vehicle: {
        email: String,
        plate: String,
        vin: String,
        model: String,
        color: String,
        validRegistration: String,
        validInsurance: String,
        registeredOwner: String,
        isStolen: String,
        activeCommunityID: String,
        userID: String,
        createdAt: Date,
        updatedAt: Date
    }
});

vehicleSchema.methods.createVeh = function (request, response) {
    // console.debug("request body: ", request.body)
    this.vehicle.plate = request.body.plate.trim().toUpperCase();
    if (!exists(request.body.vin)) {
        request.body.vin = ""
    }
    this.vehicle.vin = request.body.vin.trim().toUpperCase();
    this.vehicle.model = request.body.model.trim().charAt(0).toUpperCase() + request.body.model.trim().slice(1);
    this.vehicle.color = request.body.color.trim().charAt(0).toUpperCase() + request.body.color.trim().slice(1);
    this.vehicle.validRegistration = request.body.validRegistration;
    this.vehicle.validInsurance = request.body.validInsurance;
    this.vehicle.registeredOwner = request.body.registeredOwner.trim();
    this.vehicle.isStolen = request.body.isStolen;
    this.vehicle.activeCommunityID = request.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.vehicle.userID = request.body.userID; // we set this when submitting the from so it should not be null
    this.vehicle.createdAt = new Date();
    response.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Vehicle', vehicleSchema);