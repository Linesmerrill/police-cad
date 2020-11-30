var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
    user: {
        username: String,
        callSign: String,
        email: String,
        password: String,
        name: String,
        firstName: String,
        lastName: String,
        address: String,
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        activeCommunity: String,
        dispatchStatus: String,
        dispatchStatusSetBy: String,
        dispatchOnDuty: Boolean,
        panicButtonSound: Boolean,
        createdAt: Date,
        updatedAt: Date
    }
});

userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.verifyPassword = function (password) {
    return bcrypt.compareSync(password, this.user.password);
};

userSchema.methods.updateUser = function (request, response) {
    this.user.name = request.body.name;
    this.user.address = request.body.address;
    this.user.createdAt = new Date();
    response.redirect('/user');
};



module.exports = mongoose.model('User', userSchema);