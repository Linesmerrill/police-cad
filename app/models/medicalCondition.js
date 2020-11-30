var mongoose = require('mongoose');

var conditionSchema = mongoose.Schema({
    condition: {
        dateOccurred: String,
        name: String,
        details: String,
        civilianID: String,
        activeCommunityID: String,
        userID: String,
        firstName: String,
        lastName: String,
        dateOfBirth: String,
        createdAt: Date,
        updatedAt: Date
    }
});

conditionSchema.methods.createCondition = function (req, res) {
    // console.debug("create condition req body: ", req.body)
    this.condition.dateOccurred = req.body.dateOccurred;
    this.condition.name = req.body.name;
    this.condition.details = req.body.details.trim();
    this.condition.civilianID = req.body.civilianID;
    this.condition.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.condition.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.condition.firstName = req.body.firstName.trim().toLowerCase()
    this.condition.lastName = req.body.lastName.trim().toLowerCase()
    this.condition.dateOfBirth = req.body.dateOfBirth.trim()
    this.condition.createdAt = new Date();
    res.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Condition', conditionSchema);