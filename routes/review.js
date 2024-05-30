const express=require("express");
const router=express.Router({mergeParams: true});//to get id from params
const wrapAsync=require("../utils/wrapAsync.js");
const ExpressError=require("../utils/ExpressError.js");
const {listingSchema,reviewSchema } = require("../schema.js")
const review=require("../models/review.js")
const Listing = require("../models/listing.js");
const {isLoggedIn,isReviewAuthor}=require("../middleware.js")

const validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);
    // console.log(result);
    if(error){
      throw new ExpressError(400,error);
    }else{
      next();
    }
  }

//post review route
router.post("/",isLoggedIn,validateReview,wrapAsync(async(req,res)=>{
    let listing=await Listing.findById(req.params.id);
    let newReview=new review(req.body.review);
    newReview.author=req.user._id;
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    req.flash("success","New Review posted")
    res.redirect(`/listings/${listing.id}`);
  }))
  
  //delete review route
  router.delete("/:reviewId",isLoggedIn,isReviewAuthor,wrapAsync(async (req,res)=>{
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
    await review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
  
  }))

module.exports=router;