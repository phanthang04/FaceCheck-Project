// src/controller/homeController.js
const homeController = {
  signUp: (req, res) => {
    res.render("signUp");
  },
  login: (req, res) => {
    res.render("login");
  },
  studentsList: (req, res) => {
    res.render("studentsList");
  },
  index: (req, res) => {
    res.render("home");
  },
  registerFace: (req, res) => {
    res.render("registerFace");
  },
  attendance: (req, res) => {
    res.render("attendance");
  },
  documents: (req, res) => {
    res.render("documents");
  }
};

export default homeController; // ✅ export default
