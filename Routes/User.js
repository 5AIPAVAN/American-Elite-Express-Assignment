const express = require('express');
const router = express.Router();
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const SECRETKEY = process.env.SECRET_KEY;
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const { body, validationResult } = require('express-validator');
const User = require('../Modals/User');
const { verifytoken } = require('../middleware/verifytoken');
const Post = require('../Modals/Post');

// Use helmet middleware for setting security headers
router.use(helmet());

// Use express-mongo-sanitize to prevent MongoDB Operator Injection
router.use(mongoSanitize());




// Apply rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 5 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
  });


// ROUTE-1 :- CREATE NEW USER
// METHOD USED :- POST
router.post("/create/user",limiter, async (req, res) => {
    console.log('Received request at /create/user:', req.body);

   // console.log(req.body);
    // check if any errors in validation
    const errors = validationResult(req); // USE req NOT req.body HERE
    if (!errors.isEmpty()) {
        console.log(errors);
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        console.log(req.body);
        // check if user with given email already exists

        let user1 = await User.findOne({ email: req.body.email });
        let user2 = await User.findOne({ username: req.body.username });
        if (user1 || user2) {
            console.log('user already exists');
            return res.status(400).json("A USER WITH THIS EMAIL/USERNAME ALREADY EXISTS , PLEASE LOGIN")
        }

        console.log('user does not exists');

        // generate salt for password hashing
        const salt = await bcrypt.genSalt(10);
        const securePassword = await bcrypt.hash(req.body.password, salt);

        console.log(req.body);

        // if no user exists -> create new user
        const user = await User.create({
            username: req.body.username,
            email: req.body.email,
            password: securePassword,
            bio: req.body.bio,
            profilepicture: req.body.profilepicture,
        })

        await user.save();

        const jwttoken = jwt.sign({
            id:user._id,
            username:user.username
        },SECRETKEY);

        // await user.save();
        console.log(user);

        res.status(200).json({ msg: "NEW USER CREATED SUCCESSFULLY", user,jwttoken });

    } catch (error) {
        console.log('error in create user');
        console.log(error);
        return res.status(400).json("SOME ERROR OCCURED IN try-catch in /create/user route:" + error)
    }

})


// ROUTER-2:- USER LOGIN

router.post("/login",limiter, [
    body('email', 'EMAIL MUST HAVE MINIMUM LENGTH 5').isLength({ min: 5 }),
    body('password', 'USERNAME MUST HAVE MINIMUM LENGTH 3').isLength({ min: 3 })], async (req, res) => {
        console.log(req.body);
        // check if any errors in validation
        const errors = validationResult(req); // USE req NOT req.body HERE
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try{

            // if we are using .select("-password") -> i.e not selecting passsword from database
            // then we will we unable to use bcrypt.compare as it require user.passsword to compare
        // const user = await User.findOne({email:req.body.email}).select("-password");
        
        // THEREFORE ALSO SELECT PASSWORD FROM DATABASE
         const user = await User.findOne({email:req.body.email});
        
        if(!user){
           return res.status(400).json("NO USER EXISTS WITH GIVEN EMAIL ID");
        }

        const comparePassword = await bcrypt.compare(req.body.password,user.password);

        if(!comparePassword){
            console.log("INCORRECT PASSWORD");
            return res.status(400).json("INCORRECT PASSWORD");
        }

        const jwttoken = await jwt.sign({
            id:user._id,
            username:user.username
        },SECRETKEY);

        return res.status(200).json({msg:"USER FOUND",user,jwttoken});
    }catch(error){
        return res.status(400).json("SOME ERROR OCCURED IN try-catch in /login route:" + error)
    }


    })


// login user trying to following other user with help of his id
router.put("/follow/:id" , verifytoken , async(req , res)=>{
    console.log("follow route");
    if(req.params.id !== req.user.id){
        const user = await User.findById(req.user.id);
        const otheruser = await User.findById(req.params.id);

        if(!otheruser.followers.includes(req.user.id)){
            await otheruser.updateOne({$push:{followers:req.user.id}});
            await user.updateOne({$push:{following:req.params.id}});
            return res.status(200).json("logged in user started following given user");
        }else{
            await otheruser.updateOne({$pull:{followers:req.user.id}});
            await user.updateOne({$pull:{following:req.params.id}});
            return res.status(200).json("successfully Unfollowed given user");
        }
    }else{
        return res.status(400).json("You can't follow yourself")
    }
})






// UPDATE USER PROFILE

router.put("/updateprofile/:id", verifytoken, async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            const updatedFields = {};

            // Update password if provided
            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                const securePassword = await bcrypt.hash(req.body.password, salt);
                updatedFields.password = securePassword;
            }

            // Update profile picture if provided
            if (req.body.profilepicture) {
                updatedFields.profilepicture = req.body.profilepicture;
            }

            // Update bio if provided
            if (req.body.bio) {
                updatedFields.bio = req.body.bio;
            }

            // Update username if provided
            if (req.body.username) {
                updatedFields.username = req.body.username;
            }

            const updateuser = await User.findByIdAndUpdate(req.params.id, {
                $set: updatedFields
            }, { new: true }); // Set { new: true } to return the updated document

            res.status(200).json({ msg: "PROFILE UPDATED SUCCESSFULLY", updateuser });
        } else {
            return res.status(400).json("YOU CANNOT UPDATE OTHERS PROFILE");
        }
    } catch (error) {
        return res.status(400).json("SOME ERROR OCCURRED IN try-catch in /update/:id " + error);
    }
});








// ROUTE-4 :- DELETE USER ACCOUNT
// METHOD USED :- DELETE

router.delete("/delete/:id",verifytoken, async (req, res) => {

    try {

        if(req.params.id !== req.user.id){
            return res.status(400).json("YOU CANNOT DELETE OTHERS ACCOUNT");
        }

      const user = await User.findByIdAndDelete(req.params.id)
      res.status(200).json({msg:"ACCOUNT DELETED SUCCESSFULLY",user});


    } catch (error) {
        return res.status(400).json("SOME ERROR OCCURED IN try-catch in /delete/:id " + error );
    }

})


// GET USER DETAILS FOR A POST

router.get("/post/user/details/:id",async(req,res)=>{
    try{
    const user = await User.findById(req.params.id);
    // console.log("UserID requested"+req.params.id);
    if(!user){
        req.status(400).send("CAN'T GET USER FOR A POST");
    }
    const {email,password,phonenumber,...others}= user._doc;
    // remaining details will be stores in others variable
    // others contain username,profilpicture
    // console.log(others)
    res.status(200).send(others);
}catch(error){
    return res.status(400).send("SOME ERROR IN TRY_ CATCH (get user for a post)")
}

})



// GET USER DETAILS WITH USERID
router.get("/viewprofile/:id",async(req,res)=>{
    try{
    const user = await User.findById(req.params.id);
    if(!user){
        req.status(400).send("CAN'T GET USER ");
    }
    const {email,password,bio,...others}= user._doc;
    // remaining details will be stored in others variable
    // others contain username,profilpicture
    res.status(200).send({User: others});
}catch(error){

    return res.status(400).send("SOME ERROR IN TRY_ CATCH (view user)")
}

})




// GET FOLLOWING LIST OF LOGGED IN USER

router.get("/get/followings/:id", async(req,res)=>{
    try{
        console.log("get followings route",req.params.id);
        const user = await User.findById(req.params.id);
        const followings = await Promise.all(
            user.following.map((item)=>{
                return User.findById(item);
            })
        )

        let followingList =[];

        followings.map((person)=>{
            const {email,password,followers,following,...others}=person._doc;
            followingList.push({others})
        })


        return res.status(200).send(followingList)
    }catch(error){
        
        return res.status(400).send("SOME ERROR OCCURED IN try-catch")
    }
})


// GET FOLLOWERS LIST OF LOGGED IN USER

router.get("/get/followers/:id",async(req,res)=>{
    try{

        const user = await User.findById(req.params.id);
        const FFollowers = await Promise.all(
            user.followers.map((item)=>{
                return User.findById(item);
            })
        )

        let FFollowersList =[];

        FFollowers.map((person)=>{
            const {email,password,followers,following,...others}=person._doc;
            FFollowersList.push({others})
        })


        return res.status(200).send(FFollowersList)

    }catch(error){
        
        return res.status(400).send("SOME ERROR OCCURED IN try-catch")
    }
})


// get all posts from followings and his posts in lastest first order
router.get('/followingposts', verifytoken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
  
      // Convert string IDs to ObjectId using new ObjectId()
      const followingIds = user.following.map(userId => new mongoose.Types.ObjectId(userId));
  
      const followingPosts = await Post.aggregate([
        {
          $match: { user: { $in: followingIds } }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $project: {
            _id: 1,
            user: 1,
            description: 1,
            likes: 1,
            comments: 1,
            createdAt: 1
          }
        }
      ]);
  
      res.status(200).json(followingPosts);
    } catch (error) {
      console.error('Error in /followingposts route:', error);
      return res.status(400).json('Error occurred in /followingposts route: ' + error.message);
    }
  });

module.exports = router;
