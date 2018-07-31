const express = require('express');
const request = require('request').defaults({ encoding: null });
const Canvas = require('canvas-prebuilt');
const Image = Canvas.Image;
const app = express();
const allowCrossDomain = function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With,  Cache-Control, Content-Type, Accept, Authorization");

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
};

// default options
app.use(allowCrossDomain);

app.post('/getqrcode', function (req, res) {
    // const imageURL = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=https://www.infiniteimaginations.co/?qr=1/#/hello/';
    const imageURL = req.body.endpoint;

    request({
        url: imageURL,
        encoding: 'binary'
    }, function (err, response, buffer) {
        let type = response.headers["content-type"];
        let prefix = "data:" + type + ";base64,";
        let base64 = new Buffer(buffer, 'binary').toString('base64');
        let dataURI = prefix + base64;

        const pattRatio = 0.5;
        const whiteMargin = 0.1;
        const blackMargin = (1 - 2 * whiteMargin) * ((1 - pattRatio) / 2);
        const innerMargin = whiteMargin + blackMargin;

        let canvas = new Canvas;
        let context = canvas.getContext('2d');
        canvas.width = canvas.height = 512;

        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // copy image on canvas
        context.fillStyle = 'black';
        context.fillRect(
            whiteMargin * canvas.width,
            whiteMargin * canvas.height,
            canvas.width * (1 - 2 * whiteMargin),
            canvas.height * (1 - 2 * whiteMargin)
        );

        // clear the area for innerImage (in case of transparent image)
        context.fillStyle = 'white';
        context.fillRect(
            innerMargin * canvas.width,
            innerMargin * canvas.height,
            canvas.width * (1 - 2 * innerMargin),
            canvas.height * (1 - 2 * innerMargin)
        );

        let innerImage = new Image;
        innerImage.onload = function () {
            // draw innerImage
            context.drawImage(innerImage,
                innerMargin * canvas.width,
                innerMargin * canvas.height,
                canvas.width * (1 - 2 * innerMargin),
                canvas.height * (1 - 2 * innerMargin)
            );

            canvasDataURL = canvas.toDataURL()
            console.log('Image has loaded!');
        };
        innerImage.src = dataURI;

        let base64Img = canvasDataURL.split(",")[1];
        let fullMarkerImage = new Buffer(base64Img, 'base64');

        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': fullMarkerImage.length
        });

        res.end(fullMarkerImage);
        console.log('Full marker generated!');
    });
});

app.listen(process.env.PORT || 8888, function () {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});