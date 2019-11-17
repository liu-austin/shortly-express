const parseCookies = (req, res, next) => {
  var cookieObj = {};
  if (req.headers.cookie) {
    // console.log(req.headers.cookie);
    var cookies = req.headers.cookie.split('; ');
    cookies.forEach(cookie => {
      var cookieArr = cookie.split('=');
      cookieObj[cookieArr[0]] = cookieArr[1];
    });
  }
  req.cookies = cookieObj;
  console.log(req.cookies);
  next();
};

module.exports = parseCookies;