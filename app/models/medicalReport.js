var mongoose = require('mongoose');

var medicalReportSchema = mongoose.Schema({
    report: {
        date: String,
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

medicalReportSchema.methods.createReport = function (request, response) {
    // console.debug("create medical report request body: ", request.body)
    this.report.date = request.body.reportDate;
    this.report.details = request.body.details.trim();
    this.report.civilianID = request.body.civilianID;
    this.report.reportingEmsID = request.body.reportingEmsID;
    this.report.hospitalized = request.body.hospitalized;
    this.report.activeCommunityID = request.body.activeCommunityID; // we set this when submitting the from so it should not be null
    this.report.userID = request.body.userID; // we set this when submitting the from so it should not be null
    this.report.firstName = request.body.firstName.trim().toLowerCase()
    this.report.lastName = request.body.lastName.trim().toLowerCase()
    this.report.dateOfBirth = request.body.dateOfBirth.trim()
    this.report.createdAt = new Date();
    response.redirect('/ems-dashboard');
};

module.exports = mongoose.model('MedicalReport', medicalReportSchema);