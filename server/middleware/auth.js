const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  if (req.cookies.shortlyid) {
    var hash = req.cookies.shortlyid;
    models.Sessions.get({hash})
      .then(sessionData => {
        if (sessionData) {
          req.session = sessionData;
          res.cookie('shortlyid', req.session.hash);
        } else {
          res.redirect('/login');
        }
      }).catch(err => res.send(err));
    next();
  } else {
    // var cookies = req.cookies;
    // console.log(cookies);
    models.Sessions.create()
      .then(hashData => JSON.stringify(hashData))
      .then(string => JSON.parse(string))
      .then(obj => {
        var hashId = obj.insertId;
        return models.Sessions.get({id: hashId});
      })
      .then(results => {
        req.session = results;
        res.cookie('shortlyid', req.session.hash);
      }).catch(err => res.send(err));
    next();
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

