const express = require('express');
const router = express.Router();
const User = require('../Modals/User');
const Post = require('../Modals/Post');
const { verifytoken } = require('../middleware/verifytoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Middleware for rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});

// Middleware to sanitize request data to prevent MongoDB Operator Injection
const sanitizeMiddleware = mongoSanitize();

// Use helmet middleware for setting various HTTP headers
router.use(helmet());

// Apply rate limiting middleware
router.use(limiter);

// Apply data sanitization middleware
router.use(sanitizeMiddleware);


// ROUTE-1 :- CREATE NEW POST
// METHOD USED :- POST
router.post("/createpost", verifytoken, async (req, res) => {
    try {
        // Destructure the request body
        const { description } = req.body;

        // Create a new post
        const newPost = await new Post({
            description,
            user: req.user.id
        }).save();

        console.log('New post:', newPost);
        res.status(200).json(newPost);
    } catch (error) {
        console.error("Error in /createpost route:", error);
        res.status(500).json({ error: "An error occurred while creating a new post." });
    }
});



// ROUTE-3 :- FETCH A POST BY POST ID
// METHOD USED :- GET
router.get("/getpost/:id", async (req, res) => {

        try {
        console.log(req.params.id);
        const user_posts = await Post.findById(req.params.id);
        if(!user_posts){
            return res.status(400).json("NO POST FOUND ...");
        }
        res.status(200).json(user_posts);   
        } catch (error) {
            return res.status(400).json("SOME ERROR OCCURED IN try-catch in /getpost/:id" );
        }

})


router.put("/updatepost/:id", verifytoken, async (req, res) => {
    try {
        // Find the post by ID
        let post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json("NO SUCH POST FOUND TO UPDATE...");
        }

        // Check if the user is the owner of the post
        if (post.user.toString() !== req.user.id) {
            return res.status(403).json("You are not the owner of this post. Permission denied.");
        }

        // Update the post only with a new description
        if (req.body.description && req.body.description !== post.description) {
            post.description = req.body.description;
            let updatedPost = await post.save();
            res.status(200).json(updatedPost);
        } else {
            return res.status(400).json("Please provide a new description to update the post.");
        }
    } catch (error) {
        console.error("Error in /updatepost/:id route:", error);
        return res.status(500).json("SOME ERROR OCCURRED IN try-catch in /update/post/:id");
    }
});

// ROUTE-4 :- FETCH ALL POSTS PRESENT IN DATABASE
// METHOD USED :- GET
router.get("/get/allpost",verifytoken, async (req, res) => {
    
        try {
    
        const user_posts = await Post.find();
        if(!user_posts){
            return res.status(400).json("NO POSTS FOUND ...");
        }
    
        // console.log(user_posts);
        return res.status(200).json({post: user_posts});
        
        
            }
        catch (error) {
            return res.status(400).json("SOME ERROR OCCURED IN try-catch in /get/post" );
        }

})




// ROUTE-3 :- UPDATE A POST
// METHOD USED :- PUT
router.put("/update/post/:id",verifytoken, async (req, res) => {

    try {

     let post = await Post.findById(req.params.id);

     if(!post){
        return res.status(400).json("NO SUCH POST FOUND TO UPDATE...");
     }

     post = await Post.findByIdAndUpdate(req.params.id,{
        $set:req.body
     })

     let updated_post = await post.save();

     return res.status(200).json(updated_post);


    } catch (error) {
        return res.status(400).json("SOME ERROR OCCURED IN try-catch in /update/post"+error );
    }

})



// ROUTE-6:- ADD A COMMENT ON A POST
// METHOD :- PUT

router.put("/comment/post",verifytoken,async(req,res)=>{
    console.log(req.body);
    try{
    const {comment , postId }= req.body;
    const new_comment = {
        user: req.user.id,
        username:req.user.username,
        comment:comment 
    }
    const post = await Post.findById(postId);
    post.comments.push(new_comment);
    await post.save();
   res.status(200).json({msg:"NEW COMMENT ADDED SUCCESSFULLY",post});
}catch(error){
    console.log(error);
    return res.status(400).json("SOME ERROR OCCURED IN try-catch in /comment/post "+error );
}
})

// ROUTE-7:- DELETE A POST
// METHOD :- DELETE
router.delete("/deletepost/:id", verifytoken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json("POST NOT FOUND TO DELETE");
        }

        // Check if the user is the owner of the post
        if (post.user.toString() === req.user.id) {
            const deletedPost = await Post.findByIdAndDelete(req.params.id);
            return res.status(200).json({ msg: "POST DELETED SUCCESSFULLY", deletedPost });
        } else {
            return res.status(403).json({ msg: "DELETING OTHERS POSTS IS NOT ALLOWED" });
        }
    } catch (error) {
        console.error("Error in /deletepost/:id route:", error);
        return res.status(500).json("SOME ERROR OCCURRED IN try-catch in /delete/post/:id");
    }
});





module.exports=router;