const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { error } = require("console");

app.use(express.json());
app.use(cors({
  origin: [
    'https://frontend-ecommerce-r3sc3kwpz-sujal-dholes-projects.vercel.app/', 
    'http://localhost:4000' // for local development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));;
app.use(express.urlencoded({ extended: true }));

// Database connection with mongodb
mongoose.connect(
  "mongodb+srv://sujaldhole47:1cp9x3kdmTYyVsO6@mycluster.8yeul.mongodb.net/"
);

app.get("/", (req, res) => {
  res.send("Server is running");
});

// Image Storage Engine

const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

// API Upload Endpoints Images

const staticPath = path.join(__dirname, 'upload/images');
app.use("/images", express.static(staticPath, {
  maxAge: '30d', // cache control
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `${process.env.BASE_URL || `http://localhost:${port}`}/images/${req.file.filename}`,
  });
});
// Schema for Creating Products

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: String,
    required: true,
  },
  old_price: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

// Add Product

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  await product.save();
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Creating API For deleting products

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Creating API for getting all products

app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  res.send(products);
});

// Schema Creating for User Model

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Creating API for User Registration
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "existing user found with same email address",
    });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({
    success: true,
    token,
  });
});


// Creating endpoint for user login

app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id,

                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success:true, token})
        }
        else{
            res.json({success:false, error:"Wrong Password"});
        }
    }
    else{
        res.json({success:false, error:"Wrong email id"});
    }
})

// Creating Endpoint for newcollection data

app.get('/newcollection',async (req, res)=>{
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  res.send(newcollection)
})

// Creating an endpoint for popular in women section

app.get('/popularinwomen', async (req, res)=>{
  let products = await(Product.find({category:"women"}));
  let popular_in_women = products.slice(0,4);
  res.send(popular_in_women)
})

// Creating a middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if(!token){
    res.status(401).send({errors:"Please authenticate using valid token"})
  }else{
    try{
      const data = jwt.verify(token,'secret_ecom');
      req.user = data.user;
      next();
    }catch(error){
      res.status(401).send({errors:"Please authenticate using valid token"})
    }
  }
}


// Creating endpoint for adding product in cart data
app.post('/addtocart', fetchUser, async (req, res) => {
  try {
      let userData = await Users.findOne({ _id: req.user.id });

      if (!userData) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

      // Initialize cartData if not already set
      if (!userData.cartData) {
          userData.cartData = {};
      }

      // Increment item quantity or add new item
      if (userData.cartData[req.body.itemid]) {
          userData.cartData[req.body.itemid] += 1;
      } else {
          userData.cartData[req.body.itemid] = 1;
      }

      // Update user cart data in the database
      await Users.findOneAndUpdate(
          { _id: req.user.id },
          { cartData: userData.cartData },
          { new: true } // Return updated document
      );

      // Send the updated cart data in the response
      res.json({ 
          success: true, 
          message: "Item added to cart", 
          receivedData: req.body, 
          receivdId: req.user.id, 
          cartData: userData.cartData 
      });

  } catch (error) {
      res.status(500).json({ 
          success: false, 
          message: "Server error", 
          error: error.message 
      });
  }
});

// Creating endpoint to remove product from cartData
app.post('/removefromcart', fetchUser, async (req, res) => {
  let userData = await Users.findOne({_id:req.user.id});
  if(userData.cartData[req.body.itemid]>0){
    userData.cartData[req.body.itemid]-=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send('Removed')
  }
})

// Creating endpoint to get cartData
app.post('/getcart', fetchUser, async  (req,res)=>{
  let userData = await Users.findOne({_id:req.user.id});
  res.json(userData.cartData)
})



// API Creation
app.listen(port, (error) => {
  if (!error) {
    console.log(`Server is running on port ${port}`);
  } else {
    console.log("Error" + error);
  }
})
