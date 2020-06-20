var mongoose = require('mongoose');

var medicationSchema = mongoose.Schema({
    medication: {
        startDate: String,
        name: String,
        dosage: String,
        frequency: String,
        civilianID: String,
        activeCommunityID: String,
        userID: String,
        createdAt: Date,
        updatedAt: Date
    }
});

medicationSchema.methods.createMedication = function (request, response) {
    // console.debug("create medication request body: ", request.body)
    this.medication.startDate = request.body.startDate;
    this.medication.name = request.body.name;
    this.medication.dosage = request.body.dosage.trim();
    this.medication.frequency = request.body.frequency;
    this.medication.civilianID = request.body.civilianID;
    this.medication.activeCommunityID = request.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.medication.userID = request.body.userID; // we set this when submitting the from so it should not be null
    this.medication.createdAt = new Date();
    response.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Medication', medicationSchema);