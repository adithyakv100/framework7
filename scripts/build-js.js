/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
/* eslint no-console: "off" */

const gulp = require('gulp');
const fs = require('fs');
const rollup = require('rollup-stream');
const buble = require('rollup-plugin-buble');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const replace = require('rollup-plugin-replace');
const resolve = require('rollup-plugin-node-resolve');
const header = require('gulp-header');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');

const config = require('./config.js');
const banner = require('./banner.js');

function es(components, cb) {
  const env = process.env.NODE_ENV || 'development';
  rollup({
    entry: './src/framework7.js',
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(env), // or 'production'
        '//IMPORT_COMPONENTS': components.map(component => `import ${component.capitalized} from './components/${component.name}/${component.name}';`).join('\n'),
        '//INSTALL_COMPONENTS': components.map(component => `.use(${component.capitalized})`).join('\n  '),
      }),
      buble(),
    ],
    format: 'es',
    moduleName: 'Framework7',
    useStrict: true,
    sourceMap: false,
    banner,
  })
    .on('error', (err) => {
      if (cb) cb();
      console.log(err.toString());
    })
    .pipe(source('framework7.js', './src'))
    .pipe(buffer())
    .pipe(rename('framework7.module.js'))
    .pipe(gulp.dest(`./${env === 'development' ? 'build' : 'dist'}/js/`))
    .on('end', () => {
      if (cb) cb();
    });
}
function umd(components, cb) {
  const env = process.env.NODE_ENV || 'development';
  rollup({
    entry: './src/framework7.js',
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(env), // or 'production'
        '//IMPORT_COMPONENTS': components.map(component => `import ${component.capitalized} from './components/${component.name}/${component.name}';`).join('\n'),
        '//INSTALL_COMPONENTS': components.map(component => `.use(${component.capitalized})`).join('\n  '),
      }),
      resolve({ jsnext: true }),
      buble(),
    ],
    format: 'umd',
    moduleName: 'Framework7',
    useStrict: true,
    sourceMap: env === 'development',
    banner,
  })
    .on('error', (err) => {
      if (cb) cb();
      console.log(err.toString());
    })
    .pipe(source('framework7.js', './src'))
    .pipe(buffer())
    .pipe(gulp.dest(`./${env === 'development' ? 'build' : 'dist'}/js/`))
    .on('end', () => {
      if (env === 'development') {
        if (cb) cb();
        return;
      }
      // Minified version
      gulp.src('./dist/js/framework7.js')
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(header(banner))
        .pipe(rename((filePath) => {
          /* eslint no-param-reassign: ["error", { "props": false }] */
          filePath.basename += '.min';
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./dist/js/'))
        .on('end', () => {
          cb();
        });
    });
}
function build(cb) {
  const env = process.env.NODE_ENV || 'development';

  const components = [];
  config.components.forEach((name) => {
    const capitalized = name.split('-').map((word) => {
      return word.split('').map((char, index) => {
        if (index === 0) return char.toUpperCase();
        return char;
      }).join('');
    }).join('');
    const jsFilePath = `./src/components/${name}/${name}.js`;
    if (fs.existsSync(jsFilePath)) {
      components.push({ name, capitalized });
    }
  });

  const expectCbs = env === 'development' ? 1 : 2;
  let cbs = 0;

  umd(components, () => {
    cbs += 1;
    if (cbs === expectCbs) cb();
  });

  if (env === 'production') {
    es(components, () => {
      cbs += 1;
      if (cbs === expectCbs) cb();
    });
  }
}

module.exports = build;