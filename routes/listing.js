const express=require("express");
const router=express.Router();
const wrapAsync=require("../utils/wrapAsync.js");
const ExpressError=require("../utils/ExpressError.js");
const {listingSchema,reviewSchema } = require("../schema.js")
const Listing = require("../models/listing.js");
const {isLoggedIn,isOwner}=require("../middleware.js")
const multer = require('multer')
const {storage}= require("../cloudConfig.js")
const upload =multer({storage})

const validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    // console.log(result);
    if(error){
      throw new ExpressError(400,error);
    }else{
      next();
    }
  }

  router.get("/filter/:id", wrapAsync( async (req, res, next) => {
    let { id } = req.params;
    let allListings = await Listing.find({ category: { $all: [id] } });
    console.log(allListings);
    if (allListings.length != 0) {
      res.locals.success = `Listings Find by ${id}`;
      res.render("listings/index.ejs", { allListings});
    } else {
      req.flash("error", "Listings is not here !!!");
      res.redirect("/listings");
    }
  }));

  router.get("/search", wrapAsync(async (req, res) => {
    console.log(req.query.q);
    let input = req.query.q.trim().replace(/\s+/g, " "); // remove start and end space and middle space remove and middle add one space------ \s all space /g globalsearch
    console.log(input);
    if (input == "" || input == " ") {
      //search value empty
      req.flash("error", "Search value empty !!!");
      res.redirect("/listings");
    }
  
    // convert every word 1st latter capital and other small---------------
    let data = input.split("");
    let element = "";
    let flag = false;
    for (let index = 0; index < data.length; index++) {
      if (index == 0 || flag) {
        element = element + data[index].toUpperCase();
      } else {
        element = element + data[index].toLowerCase();
      }
      flag = data[index] == " ";
    }
    console.log(element);
  
    let allListings = await Listing.find({
      title: { $regex: element, $options: "i" },
    });
    if (allListings.length != 0) {
      res.locals.success = "Listings searched by Title";
      res.render("listings/index.ejs", { allListings });
      return;
    }
    if (allListings.length == 0) {
      allListings = await Listing.find({
        category: { $regex: element, $options: "i" },//case insensitive i
      }).sort({ _id: -1 });
      if (allListings.length != 0) {
        res.locals.success = "Listings searched by Category";
        res.render("listings/index.ejs", { allListings });
        return;
      }
    }
    if (allListings.length == 0) {
      allListings = await Listing.find({
        country: { $regex: element, $options: "i" },
      }).sort({ _id: -1 });
      if (allListings.length != 0) {
        res.locals.success = "Listings searched by Country";
        res.render("listings/index.ejs", { allListings });
        return;
      }
    }
    if (allListings.length == 0) {
      let allListings = await Listing.find({
        location: { $regex: element, $options: "i" },
      }).sort({ _id: -1 });
      if (allListings.length != 0) {
        res.locals.success = "Listings searched by Location";
        res.render("listings/index.ejs", { allListings });
        return;
      }
    }
    const intValue = parseInt(element, 10); // 10 for decimal return - int ya NaN
    const intDec = Number.isInteger(intValue); // check intValue is Number & Not Number return - true ya false
  
    if (allListings.length == 0 && intDec) {
      allListings = await Listing.find({ price: { $lte: element } }).sort({
        price: 1,
      });
      if (allListings.length != 0) {
        res.locals.success = `Listings searched for less than Rs ${element}`;
        res.render("listings/index.ejs", { allListings });
        return;
      }
    }
    if (allListings.length == 0) {
      req.flash("error", "Listings is not here !!!");
      res.redirect("/listings");
    }
  }));

//Index Route
router.get("/", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  }));
  
  //New Route
  router.get("/new", isLoggedIn,(req, res) => {
    // console.log(req.user);
    // if(!req.isAuthenticated()){
    //   req.flash("error","You must be logged in to create listing!")
    //   return res.redirect("/login")
    // }
    res.render("listings/new.ejs");
  });
  
  //Show Route
  router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({path:"reviews",populate:{path:"author"},}).populate("owner");
    if(!listing){
        req.flash("error","Listing you requested doesn't exist")
        res.redirect("/listings")
    }
    console.log(listing);
    res.render("listings/show.ejs", { listing });
  }));
  
  //Create Route
  router.post("/",isLoggedIn, upload.single("listing[image]"), wrapAsync(async (req, res,next) => {
    // if(!req.body.listing){
    //   throw new ExpressError(400,"Send valid data for listing")
    // }
    console.log(req.file);
    let url=req.file.path;
    let filename=req.file.filename
    const newListing = new Listing(req.body.listing);
    newListing.image={url,filename}
    newListing.owner=req.user._id;
    await newListing.save();
    req.flash("success","New Listing created")
    res.redirect("/listings");
    
  }));
  
  //Edit Route
  router.get("/:id/edit", isLoggedIn,isOwner,wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
        req.flash("error","Listing you requested doesn't exist")
        res.redirect("/listings")
    }
    res.render("listings/edit.ejs", { listing });
  }));
  
  //Update Route
  router.put("/:id",isLoggedIn,isOwner,upload.single("listing[image]"),validateListing, wrapAsync(async (req, res) => {
    if(!req.body.listing){
      throw new ExpressError(400,"Send valid data for listing")
    }//for postman or hopscotch
    let { id } = req.params;
    let listing=await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if(typeof req.file!=="undefined"){
      let url=req.file.path
      let filename=req.file.filename
      listing.image={url,filename};
      await listing.save();
    }
    req.flash("success","Listing Edited successfully")
    res.redirect(`/listings/${id}`);
  }));
  
  //Delete Route
  router.delete("/:id", isLoggedIn,isOwner,wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    // console.log(deletedListing);
    req.flash("success","Listing Deleted successfully")
    res.redirect("/listings");
  }));

  

  module.exports=router;