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
        firstName: String,
        lastName: String,
        dateOfBirth: String,
        createdAt: Date,
        updatedAt: Date
    }
});

medicationSchema.methods.createMedication = function (req, res) {
    // console.debug("create medication req body: ", req.body)
    this.medication.startDate = req.body.startDate;
    this.medication.name = req.body.name;
    this.medication.dosage = req.body.dosage.trim();
    this.medication.frequency = req.body.frequency;
    this.medication.civilianID = req.body.civilianID;
    this.medication.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.medication.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.medication.firstName = req.body.firstName.trim().toLowerCase()
    this.medication.lastName = req.body.lastName.trim().toLowerCase()
    this.medication.dateOfBirth = req.body.dateOfBirth.trim()
    this.medication.createdAt = new Date();
    res.redirect('/civ-dashboard');
};

module.exports = mongoose.model('Medication', medicationSchema);