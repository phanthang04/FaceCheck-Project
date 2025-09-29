// src/controller/homeController.js
const homeController = {
  signUp: (req, res) => {
    res.render("signUp"); // ví dụ render file views/signUp.ejs
  },
  login: (req, res) => {
    res.render("login");
  },
  index: (req, res) => {
    res.render("home");
  }
};

export default homeController; // ✅ export default
