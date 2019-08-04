const sass = require('node-sass');
const ejs = require('ejs');
const fs = require('fs-extra');
const path = require('path');
 
module.exports = grunt => {
    require('load-grunt-tasks')(grunt);
    
    grunt.initConfig({
        sass: {
            options: {
                implementation: sass,
                sourceMap: true
            },
            dist: {
                files: {
                    'dist/style.css': 'src/styles/style.scss'
                }
            }
        },
        browserify: {
            dist: {
                files: {
                    'dist/app.js': ['src/js/*']
                }
            }
        },
        watch: {
            js: {
                files: 'src/js/*.js',
                tasks: ['browserify']
            },
            ejs: {
                files: 'src/ejs/*.ejs',
                tasks: ['ejs']
            },
            scss: {
                files: 'src/styles/*.scss',
                tasks: ['sass']
            },
            data: {
                files: 'build-data.js',
                tasks: ['data']
            }
        }
    });
    
    grunt.registerTask('ejs', 'EJS', function() {
        const done = this.async();
        (async () => {
            const opts = {
            };
            
        const file = await ejs.renderFile(path.join(__dirname, 'src', 'ejs', 'index.ejs'), opts, { async: true });

        await fs.writeFile(path.join(__dirname, 'dist', 'index.html'), file);
        })().then(done, done);
    });

    grunt.registerTask('data', 'GetData', function() {
        const done = this.async();
        (async () => {
           await require('./build-data')();
        })().then(done, done);
    });

    
    grunt.registerTask('build', ['sass', 'browserify', 'ejs']);
    grunt.registerTask('dist', ['data', 'build']);
    grunt.registerTask('default', ['build']);
}