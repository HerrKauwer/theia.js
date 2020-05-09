'use strict';

const path = require('path');
const childProcess = require('child_process');
const fs = require('fs');
const async = require('async');
const fileHelper = require('./helpers/file');
const mailHelper = require('./helpers/mail');
const config = require('./config');
const puppeteer = require('puppeteer');

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

    let changedPixels = 0;

    const tasks = [
        callback => {
            const cmd = `compare -metric ae ${lastPng} ${prevPng} null:`;

            childProcess.exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    if (stderr.includes("image widths or heights differ")) {
                        console.log("Image size has changed");
                        return callback();
                    }

                    if (err.code === 2)
                        return callback(err);
                }

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
            if (changedPixels === 0)
                return callback();

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
        , createStep(`convert mask.png -negate -threshold 99% mask.png`)
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

const lastPngFilename = settings.name + '.png';
const lastPng = config.outFolder + lastPngFilename;
const prevPngFilename = settings.name + '-prev.png';
const prevPng = config.outFolder + prevPngFilename;
const diffPngFilename = settings.name + '-diff.png';
const diffPng = config.outFolder + diffPngFilename;

let diffDetected = false;
async.series({
    renderPage: async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setViewport(settings.viewportSize || { width: 1024, height: 768, deviceScaleFactor: 1 });

        if (settings.cookies) {
            for (var i = 0; i < settings.cookies.length; i++) {
                var cookie = settings.cookies[i];
                await page.setCookie(cookie);
            }
        }

        await page.goto(settings.url);

        if (settings.captureSelector) {
            const calElement = await page.$(settings.captureSelector);
            if (calElement == null) {
                return error(`Selection ${settings.captureSelector} selected no elements`)
            }
            await calElement.screenshot({ path: lastPng });
        } else {
            await page.screenshot({ path: lastPng, clip: settings.clipRect, fullPage: true });
        }

        await browser.close();
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
                filename: lastPngFilename,
                path: lastPng
            }, {
                filename: prevPngFilename,
                path: prevPng
            }, {
                filename: diffPngFilename,
                path: diffPng
            }];

            mailHelper.sendDiffMail(
                `Something has changed on ${settings.name}`,
                `Hi!\r\nThe contents of ${settings.url} have changed!`,
                attachments, settings.email, callback);
        } else if (settings.mode === modes.sendEmailEveryTime) {
            attachments = [{
                filename: lastPngFilename,
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