var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var firearmSchema = mongoose.Schema({
    firearm: {
        serialNumber: String,
        weaponType: String,
        registeredOwner: String,
        isStolen: String,
        activeCommunityID: String,
        userID: String,
        createdAt: Date,
        updatedAt: Date
    }
});

firearmSchema.methods.createFirearm = function (request, response) {
    // console.debug("request body: ", request.body)
    this.firearm.serialNumber = request.body.serialNumber;
    this.firearm.weaponType = request.body.weaponType;
    this.firearm.registeredOwner = request.body.registeredOwner.trim();
    this.firearm.isStolen = request.body.isStolen;
    this.firearm.activeCommunityID = request.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.firearm.userID = request.body.userID; // we set this when submitting the from so it should not be null
    this.firearm.createdAt = new Date();
    response.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Firearm', firearmSchema);