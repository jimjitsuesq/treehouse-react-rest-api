'use strict';

const express = require('express');
const { asyncHandler } = require('./middleware/async-handler');
const { User, Course } = require('./models');
const { authenticateUser } = require('./middleware/auth-user');
const cookieParser = require('cookie-parser');

// Construct a router instance.
const router = express.Router();

/**
 * Route to log in a User
 */
router.get('/users', authenticateUser, asyncHandler(async (req, res) => {
  const options = {
    httpOnly: false,
    signed: true
  }
  const authenticatedUser = await User.findOne({ 
    where: {emailAddress: req.currentUser.emailAddress},
    attributes: {exclude: ['createdAt', 'updatedAt']}});
    console.log(authenticatedUser)
  res.status(200).cookie('user', authenticatedUser.password, { signed: true }).json({ authenticatedUser })
}));

/**
 * Route to log out a user
 */

router.get('/signout', (req, res) => {
  res.clearCookie('user');
  res.status(200).end();
})

/**
 * Route to create a new user
 */
router.post('/users', asyncHandler(async (req, res) => {
    try {
      await User.create(req.body);
        return res.status(201).send();
    } catch (error) {
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        const errors = error.errors.map(err => err.message);
        res.status(400).json({ errors });
        console.error(errors) 
      } 
    }
}));

/**
 * Route to return all courses and the users associated with each course
 */
router.get('/courses', asyncHandler(async (req, res) => {
  let courses = await Course.findAll({
    attributes: {exclude: ['createdAt', 'updatedAt']}, 
    include: [{ 
      model: User,
      attributes: {exclude: ['createdAt', 'updatedAt']}
    }]
  });
  res.status(200).json({courses})
}));

/**
 * Route to return the course associated with a given id
 */
router.get('/courses/:id', asyncHandler(async (req, res) => {
  try {
    let course = await Course.findByPk(req.params.id, {
      attributes: {exclude: ['createdAt', 'updatedAt']}, 
      include: [{ 
        model: User,
        attributes: {exclude: ['createdAt', 'updatedAt']}
      }]
    });
    if(course !== null) {
      res.status(200).json({course})
    } else {
      res.sendStatus(404)
    }
  } catch (error) {
    throw (error)
  }
}));

/**
 * Route to create a new course
 */
router.post('/courses', authenticateUser, asyncHandler(async (req, res, next) => {
  try {
    let course = await Course.create(req.body);
    res.status(201).location(`api/courses/${course.id}`).end()
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors });
      console.error(errors)
    } else {
      throw error;
    }
  }
}));

/**
 * Route to modify an existing course
 */
router.put('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
  try {
    const course = req.body;
    const courseToUpdate = await Course.findByPk(req.params.id); 
    if ( courseToUpdate.userId === req.currentUser.id) {
      await Course.update(course, { where: { id: req.params.id } } );
      res.status(204).end();
    } else {
      res.status(403).end();
    }
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).send({ errors })
      console.log(error.message)
    } else {
      throw error;
    }
  }
}));

/**
 * Route to delete an existing course
 */
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
  let course = await Course.findByPk(req.params.id);
  if ( course.userId === req.currentUser.id) {
    try{
      course.destroy();
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  } else {
    res.status(403).end()
  }
}));

module.exports = router;