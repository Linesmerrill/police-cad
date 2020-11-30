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

firearmSchema.methods.createFirearm = function (req, res) {
    // console.debug("req body: ", req.body)
    this.firearm.serialNumber = req.body.serialNumber;
    this.firearm.weaponType = req.body.weaponType;
    this.firearm.registeredOwner = req.body.registeredOwner.trim();
    this.firearm.isStolen = req.body.isStolen;
    this.firearm.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.firearm.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.firearm.createdAt = new Date();
    res.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Firearm', firearmSchema);