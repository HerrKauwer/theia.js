const mailer = require("nodemailer");
const async = require('async');
const config = require('../config.js');

const smtpTransport = mailer.createTransport(config.emailTransport);

exports.sendDiffMail = (subject, body, attachments, emailaddress, callback) => {
    const mailOptions = {
        from: config.emailFrom,
        subject: subject,
        text: body,
        attachments: attachments
    };

    const splitAddresses = emailaddress.split(",");

    async.eachSeries(splitAddresses, (emailaddress, callback) => {
        mailOptions.to = emailaddress;

        console.log(`sending to ${emailaddress}`);

        smtpTransport.sendMail(mailOptions, (error, response) => {
            callback(error);
        });
    }, error => {
        callback(error);
    });
};