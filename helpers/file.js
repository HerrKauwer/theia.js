const fs = require('fs');

exports.move = function (from, to, callback) {
    const is = fs.createReadStream(from);
    const os = fs.createWriteStream(to);

    is.on("end", function () {
        fs.unlink(from, callback);
    });

    is.on("error", callback);

    is.pipe(os);
};