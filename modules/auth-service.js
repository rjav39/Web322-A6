const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config()

let Schema = mongoose.Schema;

const userSchema = new Schema({
    userName: {
        type: String,
        unique: true,
    },
    password: String,
    email: String,
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});


let User;

function initialize(){

    return new Promise((resolve, reject) => {
        let db = mongoose.createConnection(process.env.MONGODB);

        db.on('error', (err)=>{
            reject(err); 
        });
        db.once('open', ()=>{
            User = db.model("users", userSchema);
            resolve();
        });
     });
}

function registerUser(userData){
    return new Promise((resolve, reject) => {

        bcrypt.hash(userData.password, hash)
        .then(hash => {
            
            let newUser = new User({
                userName: userData.userName,
                email: userData.email,
                password: hash,
                loginHistory: [{dateTime: new Date(), userData: userData.userAgent}]
            });

            newUser.save()
            .then(()=>{
                resolve();
            })
            .catch((err) => {
                if (err.code === 11000){
                    reject('User Name already taken');
                }
                else {
                    reject(`There was an error creating the user : ${err}`);
                }
            })
        })
        .catch((err)=>{
            reject("Passwords do not match");
            return;
        });

    })
}

function checkUser(userData) {
    return new Promise((resolve, reject) => {
        User.find({ userName: userData.userName })
            .exec()
            .then((users) => {
                if (users.length === 0) {
                    reject(`Unable to find user: ${userData.userName}`);
                    return;
                }

                bcrypt.compare(userData.password, users[0].password)
                    .then(result => {
                        if (result === false) {
                            reject(`Incorrect Password for user: ${userData.userName}`);
                            return;
                        }

                        if (users[0].loginHistory.length === 8) {
                            users[0].loginHistory.pop();  
                        }


                        users[0].loginHistory.unshift({
                            dateTime: (new Date()).toString(),
                            userAgent: userData.userAgent
                        });
 
                        User.updateOne({ userName: users[0].userName }, { $set: { loginHistory: users[0].loginHistory } })
                            .then(() => {
                                resolve(users[0]);
                            })
                            .catch((err) => {
                                reject(`There was an error verifying the user: ${err}`);
                            });
                    })
                    .catch(err => {
                        reject(`Error comparing passwords: ${err}`);
                    });
            })
            .catch((err) => {
                reject(`Unable to find user: ${userData.userName}`);
            });
    });
}

module.exports = { initialize, registerUser, checkUser };