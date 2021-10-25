const bcrypt = require('bcryptjs')
const { User, Restaurant, Comment } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')

const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },
  signUp: (req, res, next) => {
    if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')

    User.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (user) throw new Error('Email already exists!')

        return bcrypt.hash(req.body.password, 10)
      })
      .then(hash => User.create({
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then(() => {
        req.flash('success_messages', '成功註冊帳號！')
        res.redirect('/signin')
      })
      .catch(err => next(err))
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },

  getUser: (req, res, next) => {
    User.findByPk(req.params.id, {
      include: [
        { model: Comment, include: Restaurant }
      ]
    })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")

        // sequelize issues: use "raw:true" will broken 1:many relationships
        // https://github.com/sequelize/sequelize/issues/4973
        user = user.toJSON()

        // arr.reduce(callback[accumulator, currentValue, currentIndex, array], initialValue)
        user.commentedRestaurants = user.Comments.reduce((acc, c) => {
          if (!acc.some(r => r.id === c.restaurantId)) {
            acc.push(c.Restaurant)
          }
          return acc
        }, [])

        res.render('users/profile', {
          profile: user
        })
      })
      .catch(err => next(err))
  },
  editUser: (req, res, next) => {
    User.findByPk(req.params.id)
      .then(user => {
        if (!user) throw new Error("User didn't exist!")

        res.render('users/edit', { user: user.toJSON() })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
    if (Number(req.params.id) !== Number(req.user.id)) {
      res.redirect(`/users/${req.params.id}`)
    }
    const { file } = req

    Promise.all([
      User.findByPk(req.params.id),
      imgurFileHandler(file)
    ])
      .then(([user, filePath]) => {
        if (!user) throw new Error("User didn't exist!")

        return user.update({
          name: req.body.name,
          image: filePath || user.image
        })
      })
      .then(() => res.redirect(`/users/${req.params.id}`))
      .catch(err => next(err))
  }
}

module.exports = userController
