const gulp = require('gulp')
const path = require('path')
const config = require('./config/')
const isEnv = process.env.NODE_ENV == 'production'

/**
 * Clean production directory
 */
const del = require('del')
gulp.task('clean', ['upload'], function (callback) {
    console.log('## Deployed to Server')
    console.log('## Clean compiled code')
    del(['.' + config.publicPath], callback)
})

/**
 * Compiler code
 */
const webpack = require('webpack')
const webpackConfig = require('./webpack.config')
gulp.task('build', function (callback) {
    console.log('## Start compile code')
    webpack(webpackConfig, function (err, state) {
        console.log('## Completed compile code')
        callback(err)
    })
})

/**
 * Compile code, and auto deploy to server
 */
const ftp = require('gulp-sftp')
gulp.task('upload', ['build'], function (callback) {
    console.log('## Deploying to server')
    var dev = isEnv ? config.devDist : config.devTest
    gulp.src('.' + config.publicPath + '**')
        .pipe(ftp(Object.assign(dev, {callback})))
})

/**
 * upload to test server
 */
gulp.task('devTest', ['build', 'upload', 'clean'])

/**
 * upload to production server
 */
gulp.task('devDist', ['build', 'upload', 'clean'])
