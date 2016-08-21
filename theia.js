'use strict';

const path = require('path');
const childProcess = require('child_process');
const phantomjs = require('phantomjs-prebuilt');
const binPath = phantomjs.path;
const fs = require('fs');
const async = require('async');
const fileHelper = require('./helpers/file');
const mailHelper = require('./helpers/mail');
const config = require('./config');

const modes = {
    'sendEmailOnDiff': 0,
    'sendEmailEveryTime': 1
};

function createDiff(lastPng, prevPng, diffPng, callback) {

    function createStep(cmd, ignoreStderr) {
        return callback => {
            childProcess.exec(cmd, (err, stdout, stderr) => {
                callback(err || (!ignoreStderr && stderr))
            });
        };
    }

    let changedPixels;

    const tasks = [
        callback => {
            const cmd = `compare -metric ae ${lastPng} ${prevPng} null:`;

            childProcess.exec(cmd, (err, stdout, stderr) => {
                if (err) return callback(err);

                changedPixels = Number.parseInt(stderr);

                if (changedPixels === 0) {
                    console.log("There are no changes");
                    callback('no diff');
                } else {
                    console.log(`${changedPixels} pixel(s) have changed`);
                    callback();
                }
            });
        }, callback => {
            const cmd = `identify -format "%[fx:${changedPixels}*100/(w*h)]" ${lastPng}`;

            childProcess.exec(cmd, (err, stdout, stderr) => {
                if (err || stderr) return callback(err || stderr);

                const percentageChanged = Number.parseFloat(stdout);

                console.log(`${percentageChanged}% has changed`);
                if (percentageChanged < 0.1) {
                    console.log("Changes are too small");
                    callback('no diff');
                } else {
                    callback();
                }
            });
        }, createStep(`convert ${lastPng} ${prevPng} -compose difference -composite -threshold 0 -separate -evaluate-sequence Add -blur 0x2.5 -level 01% mask.png`)
        , createStep(`convert mask.png -negate mask.png`)
        , createStep(`convert ${lastPng} -fill "#FFFFFFC8" -draw "color 0,0 reset" fill.png`)
        , createStep(`convert ${lastPng} fill.png mask.png -composite ${diffPng}`)
    ];

    async.series(tasks, error => {
        if (error && error !== 'no diff')
            return callback(error);

        callback(null, error !== 'no diff');
    });
}

const configPath = process.argv[2];

console.log('Using config', configPath);

const settings = JSON.parse(fs.readFileSync(configPath));
settings.name = path.parse(configPath).name;
if (!settings.mode) {
    settings.mode = modes.sendEmailOnDiff;
}

const lastPng = config.outFolder + settings.name + '.png';
const prevPng = config.outFolder + settings.name + '-prev.png';
const diffPng = config.outFolder + settings.name + '-diff.png';

let diffDetected = false;
async.series({
    renderPage: callback => {
        const args = [path.join(__dirname, 'phantom.js'), configPath, lastPng];

        childProcess.execFile(binPath, args, (err, stdout, stderr) => {
            if (err || stderr) return callback(err || stderr);

            console.log(stdout);

            fs.access(lastPng, fs.F_OK, (err) => {
                if (err) return callback("Screenshot of webpage was not found, phantom failed?");

                callback();
            });
        });
    },
    generateAndCheckDiff: callback => {
        if (settings.mode === modes.sendEmailEveryTime)
            return callback();

        fs.access(prevPng, fs.F_OK, (err) => {
            if (err) {
                console.log("No previous version of screenshot found, not checking for changes");
                return callback();
            }

            console.log("Going to check last and previous version for changes");

            createDiff(lastPng, prevPng, diffPng, (error, hasDifferences) => {
                diffDetected = hasDifferences || false;

                callback(error);
            });
        });
    },
    sendEmail: callback => {
        if (settings.mode === modes.sendEmailOnDiff && !diffDetected) {
            return callback();
        }

        let attachments = [];
        if (settings.mode === modes.sendEmailOnDiff) {
            attachments = [{
                filename: lastPng,
                path: lastPng
            }, {
                filename: prevPng,
                path: prevPng
            }, {
                filename: diffPng,
                path: diffPng
            }];

            mailHelper.sendDiffMail(
                `Something has changed on ${settings.name}`,
                `Hi!\r\nThe contents of ${settings.url} have changed!`,
                attachments, settings.email, callback);
        } else if (settings.mode === modes.sendEmailEveryTime) {
            attachments = [{
                filename: lastPng,
                path: lastPng
            }];

            mailHelper.sendDiffMail(
                `Latest screenshot of ${settings.name}`,
                `Hi!\r\nHere's the latest screenshot of ${settings.url}.`,
                attachments, settings.email, callback);
        }
    },
    saveAsPrevious: callback => {
        if (settings.mode === modes.sendEmailOnDiff) {
            console.log(`Moving ${lastPng} to ${prevPng}`);
            fileHelper.move(lastPng, prevPng, callback);
        }
    }
}, error => {
    if (error) {
        console.error("An error has occurred: ");
        console.error(error);
    }

    console.log("Done");
});