var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var civilianSchema = mongoose.Schema({
  civilian: {
    email: String, //deprecated 6/27/2020
    firstName: String,
    lastName: String,
    licenseStatus: String, //1: valid, 2: revoked, 3: none
    ticketCount: String,
    birthday: String,
    warrants: [{
      type: String
    }],
    gender: String,
    address: String,
    race: String,
    hairColor: String,
    weight: String,
    weightClassification: String,
    height: String,
    heightClassification: String,
    eyeColor: String,
    organDonor: Boolean,
    veteran: Boolean,
    image: String,
    occupation: String,
    firearmLicense: String,
    activeCommunityID: String,
    userID: String,
    createdAt: Date,
    updatedAt: Date
  }
});

civilianSchema.methods.updateCiv = function (req, res) {
  // console.debug('req: ', req.body)
  this.civilian.firstName = req.body.civFirstName.trim().charAt(0).toUpperCase() + req.body.civFirstName.trim().slice(1);
  this.civilian.lastName = req.body.civLastName.trim().charAt(0).toUpperCase() + req.body.civLastName.trim().slice(1);
  this.civilian.licenseStatus = (req.body.licenseStatus ? '1' : '3');
  this.civilian.ticketCount = req.body.ticketCount;
  this.civilian.birthday = req.body.birthday;
  this.civilian.warrants = req.body.warrants;
  if (exists(req.body.address)) {
    this.civilian.address = req.body.address.trim();
  }
  if (exists(req.body.occupation)) {
    this.civilian.occupation = req.body.occupation.trim();
  }
  if (exists(req.body.firearmLicense)) {
    this.civilian.firearmLicense = req.body.firearmLicense;
  }
  if (exists(req.body.activeCommunityID)) {
    this.civilian.activeCommunityID = req.body.activeCommunityID;
  }
  if (exists(req.body.gender)) {
    this.civilian.gender = req.body.gender;
  }
  // height classification: imperial or metric, imperial will have 2 inputs and metric will have one
  if (exists(req.body.heightClassification)) {
    this.civilian.heightClassification = req.body.heightClassification;
    // if user has selected 'imperial', then we should calculate USA maths for height
    // else just grab whatever value was passed in for height
    if (req.body.heightClassification === 'imperial') {
      // because the USA is dumb, we gotta do some quick-maths to convert ft and inches to a single number :fml:
      this.civilian.height = generateHeight(req.body.heightFoot, req.body.heightInches)
    } else {
      if (exists(req.body.heightCentimeters)) {
        this.civilian.height = req.body.heightCentimeters;
      }
    }
  }

  if (exists(req.body.weightImperial)) {
    this.civilian.weight = req.body.weightImperial;
  } else if (exists(req.body.weightMetric)) {
    this.civilian.weight = req.body.weightMetric;
  }
  if (exists(req.body.weightClassification)) {
    this.civilian.weightClassification = req.body.weightClassification;
  }
  if (exists(req.body.eyeColor)) {
    this.civilian.eyeColor = req.body.eyeColor;
  }
  if (exists(req.body.hairColor)) {
    this.civilian.hairColor = req.body.hairColor;
  }
  if (exists(req.body.organDonor)) {
    if (req.body.organDonor == 'on') {
      this.civilian.organDonor = true;
    } else {
      this.civilian.organDonor = false;
    }
  }
  if (exists(req.body.veteran)) {
    if (req.body.veteran == 'on') {
      this.civilian.veteran = true;
    } else {
      this.civilian.veteran = false;
    }
  }
  this.civilian.userID = req.body.userID; // we set this when submitting the form so it should not be null
  this.civilian.createdAt = new Date();
  res.redirect('/civ-dashboard');
};

function exists(v) {
  if (v !== undefined) {
    return true
  } else {
    return false
  }
}

function generateHeight(heightFoot, heightInches) {
  if (exists(heightFoot) && !exists(heightInches)) {
    //if only foot exists, then just convert to inches and store in DB
    return parseInt(heightFoot) * 12;
  }
  if (exists(heightFoot) && exists(heightInches)) {
    //if foot and inches exist, we want to convert to inches to store in DB
    return parseInt(heightFoot) * 12 + parseInt(heightInches);
  }
  if (!exists(heightFoot) && exists(heightInches)) {
    //if foot doesn't exist but inches exists, simple maths
    return parseInt(heightInches)
  }
}

module.exports = mongoose.model('Civilian', civilianSchema);