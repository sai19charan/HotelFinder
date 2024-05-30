const express=require("express");
const router=express.Router();
const User=require("../models/user.js")
const wrapAsync=require("../utils/wrapAsync.js");
const passport=require("passport")
const {saveRedirectUrl}=require("../middleware.js")

router.get("/signup",(req,res)=>{
    res.render("users/signup.ejs")
})

router.post("/signup",wrapAsync(async(req,res)=>{
    try{
        let {username,email,password}=req.body;
        const newUser=new User({email,username});
        const registeredUser=await User.register(newUser,password)
        console.log(registeredUser);
        req.login(registeredUser,(err)=>{
            if(err) return next(err);
            req.flash("success","Welcome to HotelFinder");
            res.redirect("/listings")
        })
    }catch(e){
        req.flash("error",e.message);
        res.redirect("/signup")
    }//wrapAsync will give error.ejs in random page to redirect to signup page try catch is used
    
}))

router.get("/login",(req,res)=>{
    res.render("users/login.ejs")
})

router.post("/login",saveRedirectUrl,passport.authenticate("local",{failureRedirect:"/login",failureFlash:true}),async(req,res)=>{
    req.flash("success","Welcome back to HotelFinder You r logged in!")
    let redirectUrl=res.locals.redirectUrl||"/listings"
    console.log("redirect",redirectUrl)
    // if(redirectUrl.substring())
    res.redirect(redirectUrl)
})

router.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err) return next(err);
        req.flash("success","you are logged out")
        res.redirect("/listings")
    })
})

module.exports=router;