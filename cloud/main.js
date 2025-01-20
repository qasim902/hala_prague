const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

Parse.Cloud.define("getAppData", async (request) => {
  try {
    let query = new Parse.Query("Categories");
    query.ascending("sortOrder");
    query.limit(99999999);
    let categories = parseResponse(await query.find());
    query = new Parse.Query("SubCategory");
    query.ascending("sortOrder");
    query.limit(99999999);
    let subCategories = parseResponse(await query.find());
    query = new Parse.Query("SectionsItem");
    query.ascending("sortOrder");
    query.limit(99999999);
    let sectionItems = parseResponse(await query.find());
    for (let category of categories) {
      switch (category.childrenType) {
        case "subCategories": {
          category.subCategories = [];
          subCategories = subCategories.sort(
            (a, b) => a.sortOrder - b.sortOrder
          );
          for (let subId of category.children) {
            let subCategory = getItemById(subCategories, subId);
            if (subCategory) {
              let loadedSectionItems = [];
              for (let itemId of subCategory.sectionItems) {
                let sectionItem = getItemById(sectionItems, itemId);
                if (sectionItem) {
                  sectionItem.categoryInfo = {
                    name: category.name,
                    categoryId: category.objectId,
                    DetailsPageType: category.DetailsPageType,
                    PageDisplayType: category.PageDisplayType,
                  };
                  loadedSectionItems.push(sectionItem);
                }
              }
              subCategory.sectionItems = loadedSectionItems;
              category.subCategories.push(subCategory);
            }
          }
          break;
        }
        case "sectionItems": {
          category.sectionItems = [];
          let sortedSections = [];
          for (let itemId of category.children) {
            let sectionItem = getItemById(sectionItems, itemId);
            if (sectionItem) {
              sectionItem.categoryInfo = {
                name: category.name,
                categoryId: category.objectId,
                DetailsPageType: category.DetailsPageType,
                PageDisplayType: category.PageDisplayType,
              };
              sortedSections.push(sectionItem);
            }
          }
          category.sectionItems.push(
            sortedSections.sort((a, b) => a.sortOrder - b.sortOrder)
          );
          break;
        }
      }
    }
    query = new Parse.Query("Sections");
    query.limit(99999999);
    let sections = parseResponse(await query.find());
    sections = sections.sort((a, b) => a.sortOrder - b.sortOrder);
    //packing Categories into their sections
    for (let section of sections) {
      section.categories = [];
      // sorting categories by their sortOrder
      categories = categories.sort((a, b) => a.sortOrder - b.sortOrder);
      for (let category of categories)
        if (category.section.objectId == section.objectId)
          section.categories.push(category);
    }
    query = new Parse.Query("PlannedTrip");
    query.limit(99999999);
    let plannedTrips = parseResponse(await query.find());
    //inserting sectionItems into the plannedTrips days locations from the
    //previous loaded sectionItems instead of loading it again from the
    // database;
    for (let trip of plannedTrips)
      for (let day of trip.days) {
        let locations = [];
        for (let location of day.locations)
          for (let sectionItem of sectionItems)
            if (sectionItem.objectId == location) {
              location = sectionItem;
              locations.push(location);
              break;
            }
        day.locations = locations;
      }
    query = new Parse.Query("Embassies");
    query.limit(99999999);
    let embassies = await query.find();
    query = new Parse.Query("Contacts");

    query.limit(99999999);
    let contacts = await query.find();
    query = new Parse.Query("StaticPages");
    query.limit(99999999);
    let staticPages = {};
    let staticPagesRes = parseResponse(await query.find());
    for (let staticPage of staticPagesRes) {
      staticPages[staticPage.name] = staticPage;
    }

    // hacky code
    // let tempsectionsData = JSON.stringify(sections);
    // tempsectionsData = tempsectionsData.replaceAll('localhost:1337','63.176.0.204:1337');
    // // console.log(tempsectionsData);
    // sections = JSON.parse(tempsectionsData);

    // Function to replace localhost URLs with server IP
    function adjustFileUrl(obj) {
      for (let key in obj) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          adjustFileUrl(obj[key]);
        } else if (typeof obj[key] === "string") {
          obj[key] = obj[key].replace("localhost:1337", "63.176.0.204:1337");
        }
      }
    }

    // Apply the URL adjustment to the sections object
    adjustFileUrl(sections);


    return { sections, plannedTrips, embassies, contacts, staticPages };
  } catch (error) {
    throw "Log response: " + error;
  }
});

function getItemById(list, id) {
  for (let item of list) if (item.objectId === id) return item;
  return null;
}

Parse.Cloud.define("dashboard", async (request) => {
  try {
    let query = new Parse.Query("Categories");
    query.ascending("sortOrder");

    query.limit(99999999);
    let categories = await query.find();
    query = new Parse.Query("SubCategory");
    query.ascending("sortOrder");
    query.limit(99999999);
    let subCategories = await query.find();
    query = new Parse.Query("SectionsItem");
    query.limit(99999999);
    let sectionItems = await query.find();
    query = new Parse.Query("PlannedTrip");
    query.limit(99999999);
    let plannedTrips = await query.find();
    query = new Parse.Query("Contacts");
    query.limit(99999999);
    let contacts = await query.find();
    query = new Parse.Query("Embassies");
    query.limit(99999999);
    let embassies = await query.find();
    query = new Parse.Query("StaticPages");
    query.limit(99999999);
    let staticPages = await query.find();
    query = new Parse.Query("Sections");
    query.ascending("sortOrder");
    query.limit(99999999);
    let sections = await query.find();

    query = new Parse.Query("advertisementBanners");
    query.limit(99999999);
    let advertisementBanners = await query.find();

    function adjustFileUrl(obj) {
      for (let key in obj) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          adjustFileUrl(obj[key]);
        } else if (typeof obj[key] === "string") {
          obj[key] = obj[key].replace("localhost:1337", "api.planet-destinations.com");
        }
      }
    }

    // Apply the URL adjustment to the sections object
    adjustFileUrl(sections);
    adjustFileUrl(subCategories);
    adjustFileUrl(sectionItems);

    return {
      categories,
      subCategories,
      sectionItems,
      plannedTrips,
      contacts,
      embassies,
      staticPages,
      sections,
      advertisementBanners,
    };
  } catch (error) {
    throw "Log response: " + error;
  }
});

Parse.Cloud.beforeSave("Categories", async (request) => {
  const { object } = request;

  // Sanitize the incoming data
  if (object.has("className")) {
    object.unset("className"); // Remove the className field
  }

  // Additional sanitization or validation
  if (!object.has("name")) {
    throw new Parse.Error(400, "The 'name' field is required.");
  }

  // Example: Enforcing specific formatting for a field
  const searchKeyword = object.get("searchKeyword");
  if (searchKeyword) {
    object.set("searchKeyword", searchKeyword.trim().toUpperCase());
  }

  // Allow the save to proceed
});

// cloud/main.js or cloud/functions.js

Parse.Cloud.define('deleteSectionImage', async (request) => {
  const { sectionId, imageId } = request.params;


  if (!sectionId || !imageId) {
    throw new Parse.Error(400, 'Missing parameters: sectionId and imageId are required');
  }

  try {
    // Example: Logic to delete the image
    const query = new Parse.Query('SectionsItem');
    const section = await query.get(sectionId);

    if (!section) {
      throw new Parse.Error(404, 'Section not found');
    }

    // Assuming 'images' is an array field in the 'Sections' class
    let images = section.get('images') || [];
    images = images.filter((image) => image !== imageId);

    section.set('images', images);
    await section.save();

    return { status: 'success', message: 'Image deleted successfully' };
  } catch (error) {
    throw new Parse.Error(500, error.message);
  }
});


Parse.Cloud.define("subcategory", async (request) => {
  try {
    let data = request.params.subCategory;
    let categoryId = data.category;
    let subCategory = new Parse.Object("SubCategory");
    subCategory.set("label", data.label);
    subCategory.set("sectionItems", []);

    subCategory.set("searchKeyword", data.searchKeyword);
    subCategory.set("name", data.name);
    subCategory.set("DetailsPageType", data.DetailsPageType);
    if (data.img) subCategory.set("img", data.img);
    subCategory.set("subTitle", data.subTitle);
    subCategory.set("DisplayOnMap", data.DisplayOnMap);
    let newSubCategory = parseResponse(await subCategory.save());
    var CategoriesCollection = Parse.Object.extend("Categories");
    var query = new Parse.Query(CategoriesCollection);
    let category = await query.get(categoryId);
    let categoryClone = parseResponse(category);
    categoryClone.children.push(newSubCategory.objectId);
    category.set("children", categoryClone.children);
    await category.save();
    return newSubCategory;
  } catch (error) {
    throw "Log response: " + error;
  }
});

// update subcategory sort order
Parse.Cloud.define("updateSubCategorySortOrder", async (request) => {
  let subCategories = request.params;
  subCategories = Object.values(subCategories);

  try {
    const subCategoriesTable = Parse.Object.extend("SubCategory");
    const query = new Parse.Query(subCategoriesTable);
    for (let subCategory of subCategories) {
      const subCategoryObject = await query.get(subCategory.objectId);
      subCategoryObject.set("sortOrder", subCategory.sortOrder);
      await subCategoryObject.save();
    }

    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});

Parse.Cloud.define("advertisementBanners", async (request) => {
  try {
    let data = request.params;
    const types = ["Leader Board", "MPU", "Interstitial"];

    if (!types.includes(data.type)) throw "Invalid type";

    if (!data.img) throw "img is required";

    if (!data.url) throw "url is required";

    let advertisementBanners = new Parse.Object("advertisementBanners");
    advertisementBanners.set("type", data.type);
    advertisementBanners.set("url", data.url);
    advertisementBanners.set("img", data.img);

    let newAdvertisementBanners = parseResponse(
      await advertisementBanners.save()
    );
    return newAdvertisementBanners;
  } catch (error) {
    throw "Log response: " + error;
  }
});

Parse.Cloud.define("customTrip", async (request) => {
  let body = `
   <h3>Main Info:</h3>

  <p>User Email: {email}</p>
<p>User ID: {userId}</p>
<p>Trip ID: {tripId}</p>
<br />
<hr />
<br />
<h3>Trip Info:</h3>
<p>Number of Days: {daysCount}</p>
<br />
{days}
`;
  let dayTemp = `
  <p>Day {index} :</p>
  <ul>
    {trips}
  </ul>
`;
  let locationTemp = `<li>{locationName}</li>`;
  if (!request.params.trip) throw "trip is missing";
  try {
    let trip = request.params.trip;
    let customTrip = new Parse.Object("CustomTrip");
    customTrip.set("days", trip.days);
    if (trip.tripId) customTrip.set("tripId", request.params.tripId);
    customTrip.set("type", trip.type);

    if (trip.note) customTrip.set("note", request.params.note);
    if (trip.email) customTrip.set("email", request.params.email);
    if (trip.userId) customTrip.set("email", request.params.userId);
    await customTrip.save();
    let days = [];
    let templateDays = [];
    for (let day of trip.days) {
      let dayTemplate = dayTemp;
      dayTemplate = dayTemplate.replace("{index}", day.day);
      let dayClone = {};
      dayClone.day = day.day;
      let tempLocations = [];
      dayClone.locations = [];
      for (let sectionItem of day.locations) {
        var SectionsItemCollection = Parse.Object.extend("SectionsItem");
        let query = new Parse.Query(SectionsItemCollection);
        sectionItem = parseResponse(await query.get(sectionItem));
        tempLocations.push(
          locationTemp.replace("{locationName}", sectionItem.label.en)
        );
        dayClone.locations.push(sectionItem);
      }
      dayTemplate = dayTemplate.replace("{trips}", tempLocations.join(``));

      templateDays.push(dayTemplate);
      days.push(dayClone);
    }
    body = body.replace("{daysCount}", trip.days.length);
    trip.days = days;
    if (request.params.email)
      body = body.replace("{email}", request.params.email);
    else body = body.replace("{email}", "Not specified");
    if (request.params.userId)
      body = body.replace("{userId}", request.params.userId);
    else body = body.replace("{userId}", "Not specified");
    if (request.params.tripId)
      body = body.replace("{tripId}", request.params.tripId);
    else body = body.replace("{tripId}", "Not specified");
    if (request.params.note) body = body.replace("{note}", request.params.note);
    else body = body.replace("{note}", "Not specified");
    //todo : replace email sending code with another email sending vendor code
    let parseConfig = await Parse.Config.get();

    let adminEmail = parseConfig.attributes.email;
    // let apiKey = parseConfig.attributes.apiKey;
    // let projectId = parseConfig.attributes.projectId;

    await transporter.sendMail({
      from: '"Hala Prague', // sender address
      to: adminEmail, // list of receivers
      subject: "Custom Trip", // Subject line
      html: body.replace("{days}", templateDays.join(``)),
    });


    // let res = await sendEmail(
    //   projectId,
    //   apiKey,
    //   body.replace("{days}", templateDays.join(``)),
    //   [{ userID: "12321", email: adminEmail }],
    //   {},
    //   "Stripe-subscriptionrenewal",
    //   "Custom Trip",
    //   "HTML"
    // );
    return trip;
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("planForMe", async (request) => {
  let body = `
     <h3>User Info:</h3>
     <p>User Email: {email}</p>
     <p>User ID: {userId}</p>

    <p>Full Name: {fullName}</p>
  <p>Mobile Number: {mobileNumber}</p>
  <hr />
  <h3>Trip Info:</h3>
  <p>Num of Days: {numberOfDays}</p>
  <p>From Date: {fromDate}</p>
  <p>To Date: {toDate}</p>
  <p>Num Of Adults: {numOfAdults}</p>
  <p>Num Of Childs: {numOfChilds}</p>
  <p>Children Ages: {childrenAges}</p>
  <p>Min Budget: {minBudget}</p>
  <p>Max Budget: {maxBudget}</p>
  <hr />
  <h3>Note:</h3>
  <p>{note}</p>
`;
  if (!request.params.trip) throw "trip is missing";
  try {
    let trip = request.params.trip;
    let tripRequest = new Parse.Object("PlanForMe");
    if (request.params.email) {
      tripRequest.set("email", request.params.email);
      body = body.replace("{email}", request.params.email);
    } else body = body.replace("{email}", "Not specified");
    if (request.params.userId) {
      tripRequest.set("userId", request.params.userId);

      body = body.replace("{userId}", request.params.userId);
    } else body = body.replace("{userId}", "Not specified");
    if (trip.fromDate) {
      tripRequest.set("fromDate", new Date(trip.fromDate));
      body = body.replace("{fromDate}", trip.fromDate);
    } else body = body.replace("{fromDate}", "Not specified");
    if (trip.toDate) {
      tripRequest.set("toDate", new Date(trip.toDate));
      body = body.replace("{toDate}", trip.toDate);
    } else body = body.replace("{toDate}", "Not specified");
    tripRequest.set("numberOfDays", trip.numberOfDays);
    tripRequest.set("tripType", trip.tripType);
    tripRequest.set("accommodationType", trip.accommodationType);
    tripRequest.set("meals", trip.meals);
    tripRequest.set("fullName", trip.fullName);
    tripRequest.set("mobileNumber", trip.mobileNumber);
    tripRequest.set("numOfAdults", trip.numOfAdults);
    tripRequest.set("numOfChilds", trip.numOfChilds);
    tripRequest.set("childrenAges", trip.childrenAges);
    tripRequest.set("minBudget", trip.minBudget);
    tripRequest.set("maxBudget", trip.maxBudget);
    tripRequest.set("note", trip.note); //optional
    await tripRequest.save();
    body = body.replace("{numberOfDays}", trip.numberOfDays);
    body = body.replace("{tripType}", trip.tripType);
    body = body.replace("{accommodationType}", trip.accommodationType);

    body = body.replace("{meals}", trip.meals);
    body = body.replace("{fullName}", trip.fullName);
    body = body.replace("{mobileNumber}", trip.mobileNumber);
    body = body.replace("{numOfAdults}", trip.numOfAdults);
    body = body.replace("{numOfChilds}", trip.numOfChilds);
    body = body.replace("{childrenAges}", trip.childrenAges);
    body = body.replace("{minBudget}", trip.minBudget);
    body = body.replace("{maxBudget}", trip.maxBudget);
    body = body.replace("{note}", trip.note);
    //todo : replace email sending code with another email sending vendor code
    let parseConfig = await Parse.Config.get();
    let adminEmail = parseConfig.attributes.email;
    // let apiKey = parseConfig.attributes.apiKey;
    // let projectId = parseConfig.attributes.projectId;

    await transporter.sendMail({
      from: '"Hala Prague', // sender address
      to: adminEmail, // list of receivers
      subject: "Plan For Me Request", // Subject line
      html: body,
    });



    // let res = await sendEmail(
    //   projectId,
    //   apiKey,
    //   body,
    //   [{ userID: "12321", email: adminEmail }],
    //   {},
    //   "Stripe-subscriptionrenewal",
    //   "Plan For Me Request",
    //   "HTML"
    // );
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("deleteCategory", async (request) => {
  try {
    let id = request.params.id;
    var CategoriesCollection = Parse.Object.extend("Categories");
    var query = new Parse.Query(CategoriesCollection);
    let category = await query.get(id);
    let categoryClone = parseResponse(category);
    if (categoryClone.childrenType == "subCategories") {
      for (let sub of categoryClone.children) {
        var SubCategoryCollection = Parse.Object.extend("SubCategory");
        query = new Parse.Query(SubCategoryCollection);
        let subCat = await query.get(sub);
        await subCat.destroy();
      }
    }
    await category.destroy();
    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("createEmbassies", async (request) => {
  try {
    let embassies = request.params.embassies;
    for (let embassy of embassies) {
      let embassyObj = new Parse.Object("Embassies");
      embassyObj.set("label", embassy.label);
      embassyObj.set("phone", embassy.phone);
      await embassyObj.save();
    }
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("deleteSectionItem", async (request) => {
  try {
    let { id, categories, subCategories, plannedTrips } = request.params;
    if (categories && categories.length > 0) {
      var CategoriesCollection = Parse.Object.extend("Categories");
      var query = new Parse.Query(CategoriesCollection);

      for (let categoryId of categories) {
        let category = await query.get(categoryId);
        let categoryClone = parseResponse(category);
        let newChildren = categoryClone.children.filter((child) => {
          if (child != id) return child;
        });
        category.set("children", newChildren);
        await category.save();
      }
    }
    if (subCategories && subCategories.length > 0) {
      var SubCategoryCollection = Parse.Object.extend("SubCategory");
      query = new Parse.Query(SubCategoryCollection);
      for (let subId of subCategories) {
        let sub = await query.get(subId);
        let subClone = parseResponse(sub);
        let newItems = subClone.sectionItems.filter((item) => {
          if (item !== id) return item;
        });
        sub.set("sectionItems", newItems);
        await sub.save();
      }
    }
    if (plannedTrips && plannedTrips.length > 0) {
      var PlannedTripCollection = Parse.Object.extend("PlannedTrip");
      query = new Parse.Query(PlannedTripCollection);
      for (let tripId of plannedTrips) {
        let trip = await query.get(tripId);
        let tripClone = parseResponse(trip);
        for (let day of tripClone.days) {
          if (day.locations.includes(id))
            day.locations.splice(day.locations.indexOf(id), 1);
        }
        trip.set("days", tripClone.days);
        await trip.save();
      }
    }
    var ItemsColl = Parse.Object.extend("SectionsItem");
    query = new Parse.Query(ItemsColl);
    let sectionItem = await query.get(id);
    await sectionItem.destroy();
    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("deleteSubCategory", async (request) => {
  try {
    let { categoryId, subCategoryId } = request.params;
    var SubCategoryColl = Parse.Object.extend("SubCategory");
    var query = new Parse.Query(SubCategoryColl);
    let subCategory = await query.get(subCategoryId);
    await subCategory.destroy();
    var CategoryColl = Parse.Object.extend("Categories");
    query = new Parse.Query(CategoryColl);
    let category = await query.get(categoryId);
    let categoryClone = parseResponse(category);
    categoryClone.children.splice(
      categoryClone.children.indexOf(subCategoryId),
      1
    );
    category.set("children", categoryClone.children);
    await category.save();
    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});

// update category sort order
//
Parse.Cloud.define("updateCategorySortOrder", async (request) => {
  let categories = request.params;
  categories = Object.values(categories);

  try {
    const categoriesTable = Parse.Object.extend("Categories");
    const query = new Parse.Query(categoriesTable);
    for (let category of categories) {
      const categoryObject = await query.get(category.objectId);
      categoryObject.set("sortOrder", category.sortOrder);
      await categoryObject.save();
    }

    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});

Parse.Cloud.define("sectionItem", async (request) => {
  let {
    sectionItem,
    categories,
    subCategories,
    PageDispalyType,
  } = request.params;
  let data = sectionItem;
  try {
    sectionItem = new Parse.Object("SectionsItem");
    if (data.PageDispalyType == "standard") {
      sectionItem.set("location", data.location);
      sectionItem.set("TAreviewScore", data.TAreviewScore);
      sectionItem.set("price", data.price);
    }
    sectionItem.set("PageDispalyType", data.PageDispalyType);
    sectionItem.set("info", data.info);
    sectionItem.set("phone", data.phone);
    sectionItem.set("label", data.label);
    sectionItem.set("image", data.image);
    if (data.images.length > 0) sectionItem.set("images", data.images);
    sectionItem.set("website", data.website);
    sectionItem.set("RichDescription", data.RichDescription);

    sectionItem = parseResponse(await sectionItem.save());
    var CategoryColl = Parse.Object.extend("Categories");
    let query = new Parse.Query(CategoryColl);
    for (let category of categories) {
      category = await query.get(category);
      let categoryClone = parseResponse(category);
      categoryClone.children.push(sectionItem.objectId);
      category.set("children", categoryClone.children);
      await category.save();
    }
    var SubCategoryColl = Parse.Object.extend("SubCategory");
    query = new Parse.Query(SubCategoryColl);
    for (let subcategory of subCategories) {
      subCategory = await query.get(subcategory);
      let subCategoryClone = parseResponse(subCategory);
      subCategoryClone.sectionItems.push(sectionItem.objectId);
      subCategory.set("sectionItems", subCategoryClone.sectionItems);
      await subCategory.save();
    }
    return sectionItem;
  } catch (error) {
    throw "Log response: " + error;
  }
});

// update section item sort order
Parse.Cloud.define("updateSectionItemOrder", async (request) => {
  let sectionItems = request.params;
  sectionItems = Object.values(sectionItems);

  try {
    const sectionItemsTable = Parse.Object.extend("SectionsItem");
    const query = new Parse.Query(sectionItemsTable);
    for (let sectionItem of sectionItems) {
      const sectionItemObject = await query.get(sectionItem.objectId);
      sectionItemObject.set("sortOrder", sectionItem.sortOrder);
      await sectionItemObject.save();
    }

    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});

Parse.Cloud.define("requestQuotation", async (request) => {
  try {
    let { plannedTripId, email } = request.params;
    if (!(plannedTripId && email)) throw "plannedTripId, email are required.";
    let quotation = new Parse.Object("requestedQuotations");
    quotation.set("email", email);
    quotation.set("plannedTripId", plannedTripId);
    await quotation.save();
    var PlannedTripColl = Parse.Object.extend("PlannedTrip");
    query = new Parse.Query(PlannedTripColl);
    let trip = await query.get(plannedTripId);
    trip = parseResponse(trip);
    let body = `User Email: ${email} <br> Trip Name: ${trip.label.en}`;
    let parseConfig = await Parse.Config.get();
    let adminEmail = parseConfig.attributes.email;
    // let apiKey = parseConfig.attributes.apiKey;
    // let projectId = parseConfig.attributes.projectId;

    await transporter.sendMail({
      from: '"Hala Prague', // sender address
      to: adminEmail, // list of receivers
      subject: "Requesting Quotationt", // Subject line
      html: body,
    });

    // //todo : replace email sending code with another email sending vendor code
    // let res = await sendEmail(
    //   projectId,
    //   apiKey,
    //   body,
    //   [{ userID: "12321", email: adminEmail }],
    //   {},
    //   "Stripe-subscriptionrenewal",
    //   "Requesting Quotation",
    //   "HTML"
    // );
    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("feedback", async (request) => {
  try {
    let { email, phone, msg } = request.params;
    let feedback = new Parse.Object("Feedback");
    feedback.set("email", email);
    feedback.set("phone", phone);
    feedback.set("msg", msg);
    await feedback.save();

    // Prepare email body
    let body = `
  <p>User Email: ${email}</p>
  <p>Phone: ${phone}</p>
  <hr>
  <p>Message:</p>
  <p>${msg}</p>
`;


    let parseConfig = await Parse.Config.get();
    let adminEmail = parseConfig.attributes.email;

    if (!adminEmail) {
      throw new Error("Admin email is not configured in Parse Config.");
    }


    // let apiKey = parseConfig.attributes.apiKey;
    // let projectId = parseConfig.attributes.projectId;

    await transporter.sendMail({
      from: '"Hala Prague', // sender address
      to: adminEmail, // list of receivers
      subject: "Customer FeedBack", // Subject line
      html: body,
    });



  //  todo : replace email sending code with another email sending vendor code
    // let res = await sendEmail(
    //   projectId,
    //   apiKey,
    //   body,
    //   [{ userID: "12321", email: adminEmail }],
    //   {},
    //   "Stripe-subscriptionrenewal",
    //   "Customer FeedBack",
    //   "HTML"
    // );
    return true;
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define(
  "places",

  async (request) => {
    try {
      let parseConfig = await Parse.Config.get();
      let googleApiKey = parseConfig.attributes.googleApiKey;
      let url = generateGooglePlacesUrl(request.params, process.env.GOOGLE_API_KEY);
      let response = await httpRequest(url);
      return JSON.parse(response);
    } catch (error) {
      throw "Log response: " + error;
    }
  }
);
Parse.Cloud.define("login", async (request) => {
  try {
    let { email, password } = request.params;
    if (!(email && password && validateEmail(email))) throw "Invalid Input";
    let query = new Parse.Query("adminusers");
    query.equalTo("email", email);
    query.equalTo("password", password);
    let admin = await query.find();
    admin = admin[0];

    if (admin) {
      admin = parseResponse(admin);
      delete admin.password;

      // check if admin has already otp then return error

      const otpQuery = new Parse.Query("VerifyOtp");
      otpQuery.equalTo("email", email);
      const otpsExist = await otpQuery.find();
      // check if otp exist and expired
      if (otpsExist.length > 0) {
        const otps = parseResponse(otpsExist);
        const now = new Date();
        const otp = otps[0];
        const expiry = new Date(otp.expiry.iso);
        const diff = expiry - now;
        // if more than 3 minutes then delete otp
        if (diff > 0) {
          return { msg: "Otp already sent, Please check your email" };
        } else {
          await otpsExist[0].destroy();
        }
      }

      const otp = randomOtpGenerator();
      // otp expriy 3 minutes
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 3);

      // store otp in database new table
      const Otp = Parse.Object.extend("VerifyOtp");
      const otpObject = new Otp();
      otpObject.set("otp", otp);
      otpObject.set("expiry", expiry);
      otpObject.set("email", email);

      await transporter.sendMail({
        from: '"Hala Prague', // sender address
        to: email, // list of receivers
        subject: "OTP Verification", // Subject line
        html: `<!DOCTYPE html><html><head><title>Verification Code</title></head><body><p>Dear Admin,</p><p>Your one-time verification code is: <strong>${otp}</strong></p><p>Please enter this code in the verification field to login to your account.</p><p>This otp will expire in 3 minutes. If you did not request this code, please ignore this email.</p><p>Thank you,</p></body></html>`,
      });

      let savedOtp = await otpObject.save();
      savedOtp = parseResponse(savedOtp);
      return { verificationCode: savedOtp.objectId, email };
    } else return { msg: "Invalid Email or Password" };
  } catch (error) {
    throw "Log response: " + error;
  }
});

Parse.Cloud.define("verifyOtp", async (request) => {
  try {
    let { otp, verificationCode } = request.params;

    if (!(otp && verificationCode)) throw "Invalid Input";
    const Otp = Parse.Object.extend("VerifyOtp");
    const query = new Parse.Query(Otp);
    const otpObject = await query.get(verificationCode);
    const otpObjectClone = parseResponse(otpObject);
    if (otpObjectClone.otp == parseInt(otp)) {
      const expiry = new Date(otpObjectClone.expiry);
      const now = new Date();
      if (expiry < now) {
        return { msg: "Otp expired" };
      }

      const adminQuery = new Parse.Query("adminusers");
      adminQuery.equalTo("email", otpObjectClone.email);
      let admin = await adminQuery.find();
      admin = admin[0];

      // remove otp from database
      await otpObject.destroy();

      if (admin) {
        admin = parseResponse(admin);
        delete admin.password;
        let parseConfig = await Parse.Config.get();
        let masterKey = parseConfig.attributes.masterKey;
        return { masterKey, admin };
      } else return { msg: "Invalid Email" };
    } else {
      return { msg: "Invalid Otp" };
    }
  } catch (error) {
    throw "Log response: " + error;
  }
});

Parse.Cloud.define("prayerTimes", async (request) => {
  try {
    let url = generatePrayerTimeUrl();
    let response = await httpRequest(url);
    response = JSON.parse(response);
    let prayers = response.data.timings;
    delete prayers.Sunset;
    delete prayers.Imsak;
    delete prayers.Midnight;
    delete prayers.Sunrise;
    delete prayers.Firstthird;
    delete prayers.Lastthird;
    return prayers;
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("weather", async (request) => {
  try {
    let parseConfig = await Parse.Config.get();
    let weatherstackApiKey = parseConfig.attributes.weatherstackApiKey;
    let url = generateWeatherstackUrl(request.params, weatherstackApiKey);
    let response = await httpRequest(url);
    return JSON.parse(response);
  } catch (error) {
    throw "Log response: " + error;
  }
});
Parse.Cloud.define("currency", async (request) => {
  try {
    let parseConfig = await Parse.Config.get();
    let fixerKey = parseConfig.attributes.fixerApiKey;
    let url = generateFixerUrl(request.params, fixerKey);
    let response = await httpRequest(url);
    return JSON.parse(response);
  } catch (error) {
    throw "Log response: " + error;
  }
});

// delete logged user
Parse.Cloud.define("deleteUser", async (request) => {
  try {
    const { userId } = request.params;

    // Retrieve the user by ID
    const query = new Parse.Query(Parse.User);
    const user = await query.get(userId);

    if (user) {
      // Use the destroy method to delete the user
      await user.destroy({ useMasterKey: true });

      return { message: "User deleted successfully" };
    } else {
      return { message: "User not found" };
    }
  } catch (error) {
    throw "Log response: " + error;
  }
});

// Delete user by email
Parse.Cloud.define("deleteUserByEmail", async (request) => {
  try {
    const { email } = request.params;

    if (!email) {
      throw "Email parameter is required";
    }

    // Retrieve the user by email
    const query = new Parse.Query(Parse.User);
    query.equalTo("email", email);
    const user = await query.first({ useMasterKey: true });

    if (user) {
      // Use the destroy method to delete the user
      await user.destroy({ useMasterKey: true });

      return { message: "User deleted successfully" };
    } else {
      return { message: "User not found" };
    }
  } catch (error) {
    throw "Log response: " + error;
  }
});



// Login user with email and password
Parse.Cloud.define("user-login", async (request) => {
  const { email, password } = request.params;

  // Find user by email to get the username
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("email", email);
  const user = await userQuery.first({ useMasterKey: true });

  if (!user) {
    throw new Parse.Error(404, "User with this email not found.");
  }

  try {
    // Log in using the username retrieved by email
    const loggedInUser = await Parse.User.logIn(user.get("username"), password);
    return { message: "Login successful", user: loggedInUser.toJSON() };
  } catch (error) {
    throw new Parse.Error(401, "Invalid email or password.");
  }
});


// Utility function to generate a random string for username
function generateRandomUsername() {
  return Math.random().toString(36).substring(2, 10); // Generates an 8-character random string
}

// Register a new user with autogenerated username and mobile number
Parse.Cloud.define("register", async (request) => {
  const { name, email, password, mobile } = request.params;

  // Check if the user already exists by email
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("email", email);
  const existingUser = await userQuery.first({ useMasterKey: true });

  if (existingUser) {
    throw new Parse.Error(400, "Email already in use.");
  }

  // Generate a random username
  const username = generateRandomUsername();

  // Create a new user
  const user = new Parse.User();
  user.set("username", username);
  user.set("password", password);
  user.set("email", email);
  user.set("name", name); // Optional, custom field for name
  user.set("mobile", mobile); // Optional, custom field for mobile

  try {
    await user.signUp(null, { useMasterKey: true });
    return { message: "User registered successfully", user: user.toJSON() };
  } catch (error) {
    throw new Parse.Error(500, "Failed to register user: " + error.message);
  }
});






//helper functions
function parseResponse(response) {
  return JSON.parse(JSON.stringify(response));
}

function generateGooglePlacesUrl(params, key) {
  let url =
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json?" +
    "key=" +
    key;
  let radius = 16000;
  let location = "50.0755,14.4378";
  let sensor = false;
  if (params.location) location = params.location;
  if (params.radius) radius = params.radius;
  if (params.sensor) sensor = params.sensor;
  if (params.types) url += "&types=" + params.types;
  if (params.keyword) url += "&keyword=" + params.keyword;
  url += "&location=" + location;
  url += "&radius=" + radius;

  url += "&sensor=" + sensor;
  return url;
}

function generateWeatherstackUrl(params, key) {
  let url = "http://api.weatherstack.com/current?access_key=" + key;
  let city = "prague"; //default
  if (params.city) city = params.city;
  url += "&query=" + city;
  return url;
}

function generatePrayerTimeUrl() {
  const baseUrl = "http://api.aladhan.com/v1/timingsByCity";
  const method = "8"; // Default method

  // Get the current date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, '0');

  // Construct the date for the route
  const date = `${day}-${month}-${year}`;

  // Construct the full URL
  let url = `${baseUrl}/${date}?method=${method}&city=prague&country=Czech`;

  let city = "prague"; //default
  let country = "Czech"; //default
  url += "&city=" + city;
  url += "&country=" + country;
  return url;
}

function generateFixerUrl(params, key) {
  let url = "http://data.fixer.io/api/convert?access_key=" + key;
  let from = "CZK"; //default
  let to = "USD"; //default
  let amount = "0";
  if (params.from) from = params.from;
  if (params.to) to = params.to;

  if (params.amount) amount = params.amount;
  url += "&from=" + from;
  url += "&to=" + to;
  url += "&amount=" + amount;
  return url;
}

function httpRequest(url) {
  let http;
  if (url.includes("https")) http = require("https");
  else http = require("http");
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", function(data) {
        body += data;
      });
      res.on("end", function() {
        resolve(body);
      });
      res.on("error", (err) => {
        reject(err);
      });
    });
  });
}

function MD5(str) {
  return require("crypto")
    .createHash("md5")
    .update(str)
    .digest("hex");
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function randomOtpGenerator() {
  return Math.floor(100000 + Math.random() * 900000);
}
