const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
var Schema = mongoose.Schema;

// define the company schema
const userSchema = new Schema({
  userName: { type: String, unique: true },
  password: String,
  email: String,
  loginHistory: [{ dateTime: Date, userAgent: String }],
});

let User;

function initialize() {
  return new Promise((resolve, reject) => {
    let db = mongoose.createConnection(
      `mongodb+srv://dbUser:sukhvir1313@senecaweb.eab8l8x.mongodb.net/?retryWrites=true&w=majority`
    );

    db.on("error", (err) => {
      reject(err); // reject the promise with the provided error
    });
    db.once("open", () => {
      User = db.model("Users", userSchema);
      resolve();
    });
  });
}


function registerUser(userData) {
  let newUser;

  return new Promise((resolve, reject) => {
    // Check if passwords match
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
    } else {
      // Hash the user's password before saving it to the database
      bcrypt.hash(userData.password, 10)
        .then((hash) => {
          // Create a new User instance with the hashed password
          newUser = new User({
            userName: userData.userName,
            password: hash,
            email: userData.email,
            loginHistory: [
              {
                dateTime: new Date(),
                userAgent: userData.userAgent,
              },
            ],
          });

          // Save the new User instance to the database
          newUser.save()
            .then(() => {
              resolve();
            })
            .catch((err) => {
              if (err.code === 11000) {
                reject("User Name already taken");
              } else {
                reject(`There was an error creating the user: ${err}`);
              }
            });
        })
        .catch((err) => {
          reject("There was an error encrypting the password");
        });
    }
  });
}



function checkUser(userData) {
  return new Promise((resolve, reject) => {
    User.find({ userName: userData.userName })
      .exec()
      .then((users) => {
        console.log(users); // log the users array returned by the User.find method
        if (users.length === 0) {
          reject("Unable to find user: " + userData.userName);
        } else {
          bcrypt.compare(userData.password, users[0].password)
            .then((result) => {
              if (result) {
                const loginData = {
                  dateTime: new Date().toString(),
                  userAgent: userData.userAgent,
                };
                users[0].loginHistory.push(loginData);
                User.updateOne(
                  { userName: users[0].userName },
                  { $set: { loginHistory: users[0].loginHistory } }
                )
                  .exec()
                  .then(() => resolve(users[0]))
                  .catch((err) =>
                    reject("There was an error verifying the user: " + err)
                  );
              } else {
                reject("Incorrect Password for user: " + userData.userName);
              }
            })
            .catch((err) => {
              console.log(err); // log any errors thrown by bcrypt.compare
              reject("There was an error verifying the user: " + err);
            });
        }
      })
      .catch((err) => {
        console.log(err); // log any errors thrown by the User.find or .exec methods
        reject("Unable to find user: " + userData.userName);
      });
  });
}


module.exports = {
  initialize,
  checkUser,
  registerUser,
};
