var mongoose = require('mongoose');

var medicalReportSchema = mongoose.Schema({
    report: {
        date: String,
        time: String,
        details: String,
        civilianID: String,
        reportingEmsID: String,
        hospitalized: Boolean,
        activeCommunityID: String,
        userID: String,
        firstName: String,
        lastName: String,
        dateOfBirth: String,
        createdAt: Date,
        updatedAt: Date
    }
});

medicalReportSchema.methods.createReport = function (req, res) {
    // console.debug("create medical report req body: ", req.body)
    this.report.date = req.body.reportDate;
    this.report.time = req.body.reportTime;
    this.report.details = req.body.details.trim();
    this.report.civilianID = req.body.civilianID;
    this.report.reportingEmsID = req.body.reportingEmsID;
    this.report.hospitalized = req.body.hospitalized;
    this.report.activeCommunityID = req.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.report.userID = req.body.userID; // we set this when submitting the from so it should not be null
    this.report.firstName = req.body.firstName.trim().toLowerCase()
    this.report.lastName = req.body.lastName.trim().toLowerCase()
    this.report.dateOfBirth = req.body.dateOfBirth.trim()
    this.report.createdAt = new Date();
    res.redirect('/ems-dashboard');
};

module.exports = mongoose.model('MedicalReport', medicalReportSchema);