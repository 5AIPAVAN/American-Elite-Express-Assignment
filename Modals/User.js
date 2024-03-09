
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'  // Reference the 'User' collection for followers
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'  // Reference the 'User' collection for following
    }]
});

module.exports = mongoose.model('User', userSchema);
