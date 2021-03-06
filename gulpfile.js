const fs = require("fs");
const path = require("path");
const glob = require("glob");
const cp = require("child_process");

const fse = require("fs-extra");
const gulp = require("gulp");
const logger = require("gulplog");
const eslint = require("gulp-eslint");
const sasslint = require("gulp-sass-lint");
const mime = require("mime");
const sassdoc = require("sassdoc");

const baka = require("@joneff/baka");
const { parse } = require('sass-variable-parser');
const tasks = require("./packages/theme-tasks/gulpfile");
const sassImporterFactory = require("./packages/theme-tasks/lib/sassimporter");
const nodeSass = require("node-sass");
const dartSass = require("sass");
let sassCompiler = nodeSass;


// Settings
const paths = {
    sass: {
        src: "./packages/*/scss/**/*.scss",
        assets: "./packages/*/scss/**/*.{png,gif,ttf,woff}",
        themes: "./packages/!(theme-tasks)",
        theme: "/scss/all.scss",
        swatches: "/scss/swatches/*.scss",
        inline: "/dist/all.scss",
        dist: "/dist"
    },
    js: {
        src: "**/*.js",
        exclude: "!**/node_modules/**"
    }
};


// #region lint
gulp.task("lint:styles", function() {
    return gulp.src(paths.sass.src)
        .pipe(sasslint())
        .pipe(sasslint.format())
        .pipe(sasslint.failOnError());
});
gulp.task("lint:scripts", function() {
    return gulp.src([ paths.js.src, paths.js.exclude ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task("lint", gulp.series("lint:styles", "lint:scripts"));
// #endregion


// #region assets
gulp.task("assets", function() {
    let files = glob.sync(paths.sass.assets);

    files.forEach(function(filename) {
        logger.info(`Converting asset to data URI: ${filename}`);
        embedFile(filename);
    });

    return Promise.resolve();
});

function embedFile(filename) {
    let basename = path.basename(filename);
    let mimeType = mime.getType(filename);
    let base64 = fs.readFileSync(filename).toString("base64");
    let template = fs.readFileSync(path.join(__dirname, "lib/", "data-uri.template"), "utf8");

    let output = template
        .replace(/<FILENAME>/g, basename)
        .replace(/<MIME>/g, mimeType)
        .replace(/<BASE64>/g, base64);

    let outputFilename = path.join(
        path.dirname(filename),
        path.basename(filename, path.extname(filename)) + ".scss"
    );

    fs.writeFileSync(outputFilename, output);
}

function buildAll(themes = glob.sync(paths.sass.themes), src = paths.sass.theme) {
    return Promise.all(
        themes.map( theme => {
            const file = path.resolve(theme + src);
            const dest = path.resolve(theme + paths.sass.dist);
            const importerCWD = path.join(process.cwd() + "/" + theme);
            const options = Object.assign({}, tasks.sassOptions);

            options.importer = sassImporterFactory({ cache: true, cwd: importerCWD });

            return tasks.build(file, dest, options, sassCompiler);
        })
    );
}

function flattenSassFilesAll(themes = glob.sync(paths.sass.themes)) {
    return Promise.all(
        themes.map( theme => {
            const file = path.resolve(theme + paths.sass.theme);
            const dest = `${theme}${paths.sass.dist}/all.scss`;
            const nodeModules = `${theme}/node_modules`;

            return tasks.flattenSassFiles(file, dest, nodeModules);
        })
    );
}
// #endregion


// #region node-sass
gulp.task("sass", function() {
    let themes = glob.sync(paths.sass.themes);

    sassCompiler = nodeSass;
    return buildAll(themes);
});
gulp.task("sass:watch", function() {
    gulp.watch(paths.sass.src, gulp.series("sass"));
});
gulp.task("sass:swatches", function() {
    let themes = glob.sync(paths.sass.themes);
    flattenSassFilesAll(themes);

    sassCompiler = nodeSass;
    return buildAll(themes, paths.sass.swatches);
});
gulp.task("sass:flat", function() {
    let themes = glob.sync(paths.sass.themes);
    flattenSassFilesAll(themes);

    sassCompiler = nodeSass;
    return buildAll(themes, paths.sass.inline);
});
// #endregion


// #region dart-sass
gulp.task("dart", function() {
    let themes = glob.sync(paths.sass.themes);

    sassCompiler = dartSass;
    return buildAll(themes);
});
gulp.task("dart:watch", function() {
    gulp.watch(paths.sass.src, gulp.series("dart"));
});
gulp.task("dart:swatches", function() {
    let themes = glob.sync(paths.sass.themes);
    flattenSassFilesAll(themes);

    sassCompiler = dartSass;
    return buildAll(themes, paths.sass.swatches);
});
gulp.task("dart:flat", function() {
    let themes = glob.sync(paths.sass.themes);
    flattenSassFilesAll(themes);

    sassCompiler = dartSass;
    return buildAll(themes, paths.sass.inline);
});
// #endregion


// #region docs
gulp.task("docs", function() {
    let themes = glob.sync(paths.sass.themes);

    return Promise.all(
        themes.map( theme => {

            if (fs.existsSync(path.join(theme, ".sassdocrc")) === false) {
                return Promise.resolve();
            }

            let sassdocrc = JSON.parse( fs.readFileSync( path.join(theme, ".sassdocrc"), "utf8" ) );
            return sassdoc(theme + "/scss/**/*.scss", {
                dest: path.join(theme, "/.tmp/docs"),
                dist: path.join(theme, "/docs"),
                theme: "./docs/sassdoc-theme.js",
                meta: sassdocrc.meta,
                groups: {
                    "color-system": "Color System",
                    "typography": "Typography",
                    "charts": "Charts",
                    "undefined": "Common"
                }
            });
        })
    );
});
gulp.task("docs:check", function() {
    //git diff --exit-code --quiet -- docs/
    return gulp.task("docs")().then(function() {
        let status = cp.spawnSync("git", [ "diff", "--exit-code", "--quiet", "--", "**/docs/*" ]) .status;

        if (status !== 0) {
            throw new Error("Docs are out of date");
        }
    });
});
// #endregion


gulp.task("resolve-vars", function() {
    let themes = glob.sync(paths.sass.themes);
    const cwd = process.cwd();

    themes.forEach( theme => {
        let variablesJson = path.resolve( cwd, `${theme}/.tmp/variables.json` );
        let variablesScss = path.resolve( cwd, `${theme}/.tmp/variables.scss` );

        fse.ensureFileSync( variablesJson );
        fse.ensureFileSync( variablesScss );

        baka.compile(
            path.join( cwd, `${theme}/scss/_variables.scss` ),
            variablesScss,
            {
                nodeModules: `${theme}/node_modules`
            }
        );

        let content = fs.readFileSync( variablesScss, 'utf-8' );

        content = content.replace(/ url\("data.*?\)/g, 'none');
        content = content.replace(/\/\/.*/gm, '');
        content = content.replace(/\n/gm, '');
        content = content.replace(/;/gm, ';\n');

        const variables = parse( content, { camelCase: false } );

        fs.writeFileSync( variablesJson, JSON.stringify( variables, null, 4 ) );

    });

    return Promise.resolve();
});
