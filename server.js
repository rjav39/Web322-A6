/********************************************************************************
* WEB322 – Assignment 06
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: Rendell Velasco Student ID: 1400140218 Date: 09-12-24
*
* Published URL: https://web322-a6-git-main-rendells-projects.vercel.app/
*
********************************************************************************/
const projectData = require("./modules/projects");
const express = require('express');
const authData = require('./modules/auth-service');
const mongoose = require('mongoose');
const clientSessions = require('client-sessions');
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(
  clientSessions({
    cookieName: 'session', 
    secret: 'o6LjQ5EVNC28ZgK64hDELM18ScpFQr', 
    duration: 2 * 60 * 1000, 
    activeDuration: 1000 * 60,
  })
);
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
 });

 function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

app.set('views', __dirname + '/views');

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("home");
});

app.get('/about', (req, res) => {
  res.render("about");
});

app.get("/solutions/projects", async (req,res)=>{

  try{
    if(req.query.sector){
      let projects = await projectData.getProjectsBySector(req.query.sector);
      console.log(projects);
      (projects.length > 0) ? res.render("projects", {projects: projects}) : res.status(404).render("404", {message: `No projects found for sector: ${req.query.sector}`});
   
    }else{
      let projects = await projectData.getAllProjects();
      res.render("projects", {projects: projects});
    }
  }catch(err){
    res.status(404).render("404", {message: err});
  }

});

app.get("/solutions/projects/:id", async (req,res)=>{
  try{
    let project = await projectData.getProjectById(req.params.id);
    console.log(project);
    res.render("project", {project: project})
  }catch(err){
    res.status(404).render("404", {message: err});
  }
});

app.get("/solutions/addProject", ensureLogin, async (req, res) => {
  let sectors = await projectData.getAllSectors()
  res.render("addProject", { sectors: sectors })
});

app.post("/solutions/addProject", ensureLogin, async (req, res) => {
  
  try {
    await projectData.addProject(req.body);
    res.redirect("/solutions/projects");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }

});

app.get("/solutions/editProject/:id", ensureLogin, async (req, res) => {

  try {
    let project = await projectData.getProjectById(req.params.id);
    let sectors = await projectData.getAllSectors();

    res.render("editProject", { project, sectors });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }

});

app.post("/solutions/editProject", ensureLogin, async (req, res) => {

  try {
    await projectData.editProject(req.body.id, req.body);
    res.redirect("/solutions/projects");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

app.get("/solutions/deleteProject/:id", ensureLogin, async (req, res) => {
  try {
    await projectData.deleteProject(req.params.id);
    res.redirect("/solutions/projects");
  } catch (err) {
    res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
})

app.get('/login', (req, res) => {
  res.render('login', {
    errorMessage: "",
    userName: "" 
  });
});

app.get('/register', (req, res) => {
  res.render('register', {
    errorMessage: "", 
    successMessage: "",
    userName: "" 
  });
});

app.post('/register', (req, res) => {
  const userData = req.body;
  authData.registerUser(userData)
    .then(() => {
      res.render('register', {
        errorMessage: "",
        successMessage: "User created",
        userName: ""
      });
    })
    .catch((err) => {
      res.render('register', {
        errorMessage: err,
        successMessage: "",
        userName: req.body.userName
      });
    });
});

app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  
  authData.checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory
      };
      
      res.redirect('/solutions/projects');
    })
    .catch((err) => {
      res.render('login', {
        errorMessage: err,
        userName: req.body.userName
      });
    });
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

app.use((req, res, next) => {
  res.status(404).render("404", {message: "I'm sorry, we're unable to find what you're looking for"});
});

projectData.initialize()
.then(authData.initialize)
.then(()=>{
  app.listen(HTTP_PORT, () => { 
    console.log(`server listening on: ${HTTP_PORT}`) });
})
.catch((err) => {
  console.log(`unable to start server: ${err}`);
 });;