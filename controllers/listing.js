// THIS FILE CONTAINS FUNCTIONS AS ROUTE-HANDLERS TO PERFORM CRUD OPERATIONS IN THE LISTING MODEL.

const Listing = require("../models/listing");
const getGeoCoordinates = require("../utils/getGeoCoordinates");

// Function to Render All Listings on the `index.ejs` page:
const index = async (req, res) => {
    const listings = await Listing.find({});
    res.render("listings/index.ejs", { listings });
};

// Function to Add a Sample Listing (Only For Testing):
const addSampleListing = async (req, res) => {
    // create a demo document in the Listing collection:
    const demoListing = new Listing({
        title: "Sample Listing",
        description: "This is a sample listing for testing purposes.",
        price: 100,
        location: "New York",
        images: "",
        country: "USA"
    });

    // Save the Demo Listing to the DB
    await demoListing.save();
    res.send("Demo listing created successfully!");
}

// Function to Render form for Creating a New Property Listing:
const renderAddForm = (req, res) => {
    res.render("listings/new.ejs");
}

// Function to Add a New Listing to the Database:
const addListing = async (req, res) => {
    // Get Geo-Coordinates of the Proprty Listing Location using MapBox Geocoding API:
    let {location, country} = req.body.listing;
    let geometry = await getGeoCoordinates(location, country);

    // create a new property listing object:
    const newListing = new Listing({
        ...req.body.listing,
        geometry,
        image: {
            filename: req.file ? req.file.filename : `${req.body.listing.title} Property Image`,
            url: req.file ? req.file.path : ""
        },
        owner: req.user._id
    });

    // Save the New Listing to DB:
    await newListing.save();
    req.flash("success", "New Listing Created Successfully!");
    console.log("New Listing Created Successfully!");
    res.redirect("/listings");
}

// Function to View a Property Listing in Detail:
const viewListing = async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate({
        path: "reviews", 
        populate: {
            path: "author"
        }
    }).populate("owner", "_id username email");

    if (!listing) {
        req.flash("error", "Listing which you want to view Doesn't Exists!");
        return res.redirect("/listings");
    }
    else res.render("listings/show.ejs", { listing });
}

// Function to Render Filtered Listings, based-on user-decided category:
const filterListing = async (req, res) => {
    const { category } = req.query;
    const filteredListings = await Listing.find({ category });

    if(!filteredListings || filteredListings.length === 0) {
        if (category.includes('-')) {
            req.flash("error", `No Listings Found of Category: ${category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}!`);
        }
        else {
            req.flash("error", `No Listings Found of Category: ${category.charAt(0).toUpperCase() + category.slice(1)}!`)
        }
        return res.redirect("/listings");
    }

    res.render("listings/index.ejs", { listings: filteredListings }); 
}

// Function to Search and Render all those Listings (in DB) whose location/country matches the User's Query:
const searchListing = async (req, res) => {
    let { dest } = req.query;
    dest = dest.trim();

    let listings;
    if (dest.includes(',')) {
        const splittedDest = dest.split(','); // [location, country]
        const location = splittedDest[0].trim();
        const country = splittedDest[1].trim();

        listings = await Listing.find({ $or: [{ location }, { country }] });
    }
    else {    
        listings = await Listing.find({ $or: [{ location: dest }, { country: dest }] });
    }
    
    if(!listings || listings.length === 0) {
        req.flash("error", `No Listings Found in ${dest}!`);
        return res.redirect("/listings");
    }

    res.render("listings/index.ejs", { listings });
} 

// Function to Render a Form to Edit a Listing:
const renderEditForm = async (req, res) => {
    const { id } = req.params;   
    const listing = await Listing.findById(id);

    // optimize listing's image
    let optimizedImgUrl = listing.image.url.replace("/upload", "/upload/w_200");

    res.render("listings/edit.ejs", { listing, optimizedImgUrl });
}

// Function to Edit/Update a Listing in the DB:
const updateListing = async (req, res) => {
    const { id } = req.params;
    const geometry = await getGeoCoordinates(req.body.listing.location, req.body.listing.country);

    // Define logic to not update the image of the listing, if the user's listing-update request doesn't include the listing image:
    let prevImg;
    if (!req.body.listing.image) {
        let oldListing = await Listing.findById(id);
        prevImg = oldListing.image;
    }

    const updatedListing = {
        ...req.body.listing,
        geometry,
        image: {
            filename: req.file ? req.file.filename : prevImg.filename,
            url: req.file ? req.file.path : prevImg.url,
        }
    };

    await Listing.findByIdAndUpdate(id, updatedListing, { runValidators: true });
    console.log("Listing Updated Successfully!");
    req.flash("success", "Listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
}

// Function to Delete a Listing from DB:
const deleteListing = async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);

    req.flash("success", "Listing Deleted Successfully!");
    console.log(`Listing with ID ${id} deleted successfully`);
    res.redirect("/listings");
}

module.exports = { index, addSampleListing, renderAddForm, addListing, viewListing, filterListing, searchListing, renderEditForm, updateListing, deleteListing };