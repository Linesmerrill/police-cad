var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var firearmSchema = mongoose.Schema({
    firearm: {
        serialNumber: String,
        weaponType: String,
        registeredOwner: String,
        registeredOwnerID: String,
        isStolen: String,
        activeCommunityID: String,
        userID: String,
        createdAt: Date,
        updatedAt: Date
    }
});

firearmSchema.methods.socketCreateFirearm = function (req, res) {
    // console.debug("req body: ", req.body)
    this.firearm.serialNumber = req.body.serialNumber;
    this.firearm.weaponType = req.body.weaponType;
    this.firearm.registeredOwner = req.body.registeredOwner.trim();
    // hacky af, goal here is to separate the person_id from the person name and dob.
    // example: 5eeaebb7e23cba396869becb+Rodger Pike | DOB: 2001-01-01
    // caveat here being that if the name includes a "+" then it will incorrectly split
    // and probably cause problems. TODO: fix this edge case.
    if (this.firearm.registeredOwner.includes("+")) {
        let idPlusRegisteredOwner = this.firearm.registeredOwner.split("+")
        if (idPlusRegisteredOwner.length == 2) {
            this.firearm.registeredOwner = idPlusRegisteredOwner[1];
            this.firearm.registeredOwnerID = idPlusRegisteredOwner[0];
        } else {
            console.error(`invalid split on 'this.firearm.registeredOwner': ${this.firearm.registeredOwner}. Does not contain an array of length 2. Split value: ${idPlusRegisteredOwner}`)
        }
    } else if (this.firearm.registeredOwner == 'N/A') {
        // do nothing, this is acceptable
    } else {
        console.error(`error on this.firearm.registeredOwner: ${this.firearm.registeredOwner}. Does not contain a '+'.`)
    }
    this.firearm.isStolen = req.body.isStolen;
    this.firearm.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.firearm.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.firearm.createdAt = new Date();
};

module.exports = mongoose.model('Firearm', firearmSchema);