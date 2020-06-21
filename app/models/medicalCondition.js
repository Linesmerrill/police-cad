var mongoose = require('mongoose');

var conditionSchema = mongoose.Schema({
    condition: {
        dateOccurred: String,
        name: String,
        details: String,
        civilianID: String,
        activeCommunityID: String,
        userID: String,
        createdAt: Date,
        updatedAt: Date
    }
});

conditionSchema.methods.createCondition = function (request, response) {
    // console.debug("create condition request body: ", request.body)
    this.condition.dateOccurred = request.body.dateOccurred;
    this.condition.name = request.body.name;
    this.condition.details = request.body.details.trim();
    this.condition.civilianID = request.body.civilianID;
    this.condition.activeCommunityID = request.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.condition.userID = request.body.userID; // we set this when submitting the from so it should not be null
    this.condition.createdAt = new Date();
    response.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Condition', conditionSchema);