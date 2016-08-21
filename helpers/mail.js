const mailer = require("nodemailer");
const fs = require('fs');
const config = require('../config');

const smtpTransport = mailer.createTransport(config.emailTransport);

exports.sendDiffMail = (subject, body, attachments, emailaddress, callback) => {
    const mailOptions = {
        from: config.emailFrom,
        to: emailaddress,
        subject: subject,
        text: body,
        attachments: attachments
    };

    console.log("sending to " + mailOptions.to);
    
    smtpTransport.sendMail(mailOptions, (error, response) => {
        callback(error, response);
    });
};