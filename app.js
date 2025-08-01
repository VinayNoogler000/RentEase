// import all required libraries:
if(process.env.NODE_ENV !== "production") require("dotenv").config();
const express = require("express");
const methodOverride = require("method-override");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

// Required Models and Routers:
const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const User = require("./models/user.js");
const usersRouter = require("./routes/user.js");

// Create EXPRESS APP:
const app = express();
const PORT = process.env.PORT || 8080;

// Defining MONGO SESSION STORE for Passing it in the Options of Express-Session:
const store = MongoStore.create({
    mongoUrl: process.env.ATLASDB_URL,
    crypto: {
        secret: process.env.SESSION_SECRET
    },
    touchAfter: 60 * 60 * 24 // Session will get automatically updated 24 Hours After there are no updates/changes in the session. 
});

store.on("error", () => console.log("ERROR in MONGO-SESSION STORE", err));

// define EXPRESS-SESSION's OPTIONS with COOKIES:
const sessionOptions = {
    store: store,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + (1000 * 60 * 60 * 24 * 7), // the cookie will expire 7 days after geting saved on the browser
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true
    }
}

// ASYNC FUNCTION to CONNECT with MongoDB:
const main = async () => {
    await mongoose.connect(process.env.ATLASDB_URL);
}

// ESTABLISH CONNECTION with MONGODB:
main()
    .then(() => console.log("Successfully Connected to MongoDB"))
    .catch((err) => console.error("Error connecting to MongoDB:", err));

// MODIFY THE HTTP-REQUEST-METHOD & PARSE THE DATA EMBEDDED IN REQ'S BODY:
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// define the Path from where STATIC FILES will be Served:
app.use(express.static(path.join(__dirname, "/public")));

// set the TEMPLATE ENGINE, with its Path:
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "/views"));


// ************************* MIDDLEWARES ********************************:
app.use( session(sessionOptions) );
app.use( flash() );

app.use( passport.initialize() );
app.use( passport.session() );

// use static authenticate method of model in LocalStrategy:
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize methods of model for passport session support:
passport.serializeUser(User.serializeUser()); //store the user's information into the session
passport.deserializeUser(User.deserializeUser()); //remove the user's information from the session

app.use( (req, res, next) => {
    res.locals.alerts = { success: req.flash("success"), error: req.flash("error") };
    res.locals.currUser = req.user;
    next();
});


// *********************** ROUTE HANDLERS OR APIS ****************************:
app.get('/', (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", usersRouter);

// A Route-Handler to Handle the Client's Requests to ALL UNDEFINED ROUTES:
app.use((req, res) => {
    throw new ExpressError(404, "Page Not Found!");
});

// ERROR-HANDLING MIDDLEWARE:
app.use(( err, req, res, next ) => {
    let {statusCode = 500, message = "Internal Server Error"} = err;
    res.status(statusCode).render("error.ejs", {message});
});

// Make the Server Listen for Client's Request:
app.listen(PORT, () => {
    console.log(`Server is listening on: http://localhost:${PORT}`);
});