const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
// const users = require('./models/user');
// const sessions = require('./models/session');
const cookie = require('./middleware/cookieParser');
const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookie);
app.use(Auth.createSession);

app.get('/',
  (req, res) => {
    res.render('index');
  });

app.get('/create',
  (req, res) => {
    res.render('index');
  });

app.get('/links',
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/links',
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

app.post('/signup', (req, res, next) => {
  // console.log(req.body);
  let username = req.body.username;
  models.Users.get({username})
    .then(queryResults => {
      if (queryResults) {
        res.redirect('/signup');
      } else {
        models.Users.create(req.body)
          .then(response => {
            console.log('User successfully created.');
            res.redirect('/');
          })
          .catch(err => res.send('There was an error creating this user.\n' + err));
      }
    });
});

app.get('/signup',
  (req, res) => {
    res.render('signup');
  });

app.get('/login',
  (req, res) => {
    res.render('login');
  });

app.post('/login', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  models.Users.get({ username })
    .then(queryResults => {
      if (queryResults) {
        var storedPw = queryResults.password;
        var salt = queryResults.salt;
        var userId = queryResults.id;
        if (models.Users.compare(password, storedPw, salt)) {
          models.Sessions.update({hash: req.session.hash}, { userId })
            .then(results => JSON.stringify(results))
            .then(string => JSON.parse(string))
            .then(obj => {
              let insertId = obj.insertId;
              req.session.userId = insertId;
              req.session.user = { username };
              res.redirect('/');
            });
        } else {
          console.log('Password is incorrect');
          res.redirect('/login');
        }
      } else {
        console.log('Username not found.');
        res.redirect('/login');
      }
    });
});

app.get('/logout',
  (req, res, next) => {
    models.Sessions.delete({ hash: req.session.hash })
      .then(() => {
        res.cookie('shortlyid', null);
        req.session.userId = null;
        res.redirect('/');
      });
  });
/************************************************************/
// Write your authentication routes here
/************************************************************/
var verifySession = function(req, res, callback) {
  if (req.session.userId) {
    callback();
  } else {
    res.redirect('/login');
  }
};
module.exports = verifySession;

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
